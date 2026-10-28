import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import {
    AlertTriangle,
    Download,
    FileVideo,
    Film,
    LoaderCircle,
    Music,
    RotateCcw,
    Upload,
    X,
    Image as ImageIcon,
} from 'lucide-react';
import { useAlert } from '@/Providers/Alerts';
import { useGlobals } from '@/Providers/Globals';

const ORANGE = '#F5961C';

/* ── ffmpeg.wasm single-threaded core (no COOP/COEP headers required) ──
 * Vite bundles the ffmpeg worker as a *module* worker, where importScripts()
 * is unavailable — so the worker loads the core via dynamic import(). That
 * requires the ESM build (not UMD, which can't be import()ed → "failed to
 * import ffmpeg-core.js"). */
const CORE_VERSION = '0.12.9';
const CORE_BASE = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/esm`;

type OutputKind = 'video' | 'audio' | 'image';

interface TargetFormat {
    ext: string;
    label: string;
    mime: string;
    kind: OutputKind;
    /** Build the ffmpeg argument list for input -> output. */
    args: (input: string, output: string) => string[];
    /** Conservative retry used when the first attempt crashes the wasm module. */
    fallbackArgs?: (input: string, output: string) => string[];
}

/* Phone/WhatsApp clips can carry extra data streams, odd dimensions or rotation
 * metadata that trip the single-threaded wasm build. This variant maps only the
 * first video/audio stream, forces even dimensions and uses the lightest preset. */
const safeVideoArgs = (extra: string[]) => (i: string, o: string) => [
    '-i', i, '-map', '0:v:0', '-map', '0:a:0?', '-sn', '-dn',
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-threads', '1',
    '-c:a', 'aac', ...extra, o,
];

/* Codecs below all ship in the default @ffmpeg/core build. MP4 is the
 * primary, well-tested path; yuv420p keeps the result playable everywhere. */
const FORMATS: TargetFormat[] = [
    {
        ext: 'mp4', label: 'MP4', mime: 'video/mp4', kind: 'video',
        args: (i, o) => ['-i', i, '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', o],
        fallbackArgs: safeVideoArgs(['-movflags', '+faststart']),
    },
    {
        ext: 'webm', label: 'WebM', mime: 'video/webm', kind: 'video',
        args: (i, o) => ['-i', i, '-c:v', 'libvpx', '-b:v', '1M', '-c:a', 'libopus', o],
    },
    {
        ext: 'mov', label: 'MOV', mime: 'video/quicktime', kind: 'video',
        args: (i, o) => ['-i', i, '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', o],
        fallbackArgs: safeVideoArgs([]),
    },
    {
        ext: 'mkv', label: 'MKV', mime: 'video/x-matroska', kind: 'video',
        args: (i, o) => ['-i', i, '-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac', o],
        fallbackArgs: safeVideoArgs([]),
    },
    {
        ext: 'gif', label: 'GIF', mime: 'image/gif', kind: 'image',
        args: (i, o) => ['-i', i, '-vf', 'fps=12,scale=480:-1:flags=lanczos', o],
    },
    {
        ext: 'mp3', label: 'MP3', mime: 'audio/mpeg', kind: 'audio',
        args: (i, o) => ['-i', i, '-vn', '-c:a', 'libmp3lame', '-q:a', '2', o],
    },
    {
        ext: 'wav', label: 'WAV', mime: 'audio/wav', kind: 'audio',
        args: (i, o) => ['-i', i, '-vn', o],
    },
];

const formatBytes = (bytes: number) => {
    if (!bytes) return '—';
    if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
};

const baseName = (name: string) => name.replace(/\.[^/.]+$/, '');
const fileExt = (name: string) => name.split('.').pop()?.toLowerCase() || 'bin';

const VideoConverterPage: React.FC = () => {
    const { onMobile } = useGlobals();
    const { showError } = useAlert();

    const ffmpegRef = useRef<FFmpeg | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // Rolling tail of ffmpeg's stderr — this is where the real failure reason lives.
    const logBufRef = useRef<string[]>([]);
    // Set when the user cancels, so we don't show an error alert for it.
    const cancelledRef = useRef(false);

    const [coreLoading, setCoreLoading] = useState(false);
    const [coreReady, setCoreReadyState] = useState(false);
    // Mirrors coreReady so a retry inside one handler sees the current value.
    const coreReadyRef = useRef(false);
    const setCoreReady = (v: boolean) => {
        coreReadyRef.current = v;
        setCoreReadyState(v);
    };
    const [coreProgress, setCoreProgress] = useState(0);

    const [file, setFile] = useState<File | null>(null);
    const [target, setTarget] = useState<TargetFormat>(FORMATS[0]);

    const [converting, setConverting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logLine, setLogLine] = useState('');

    const [outUrl, setOutUrl] = useState<string | null>(null);
    const [outName, setOutName] = useState('');
    const [outSize, setOutSize] = useState(0);

    const [dragState, setDragState] = useState(false);

    // Revoke the result object URL on replacement / unmount to avoid leaks.
    const outUrlRef = useRef<string | null>(null);
    useEffect(() => {
        outUrlRef.current = outUrl;
    }, [outUrl]);
    useEffect(() => () => {
        if (outUrlRef.current) URL.revokeObjectURL(outUrlRef.current);
    }, []);

    /* Lazily download + instantiate the wasm core on first use. */
    const ensureCore = useCallback(async (): Promise<FFmpeg> => {
        if (ffmpegRef.current && coreReadyRef.current) return ffmpegRef.current;

        let ffmpeg = ffmpegRef.current;
        if (!ffmpeg) {
            ffmpeg = new FFmpeg();
            ffmpegRef.current = ffmpeg;
            // Register listeners once per instance (they survive worker restarts).
            ffmpeg.on('log', ({ message }) => {
                setLogLine(message);
                const buf = logBufRef.current;
                buf.push(message);
                if (buf.length > 50) buf.shift();
            });
            ffmpeg.on('progress', ({ progress: p }) => {
                const pct = Math.round(Math.min(Math.max(p, 0), 1) * 100);
                if (Number.isFinite(pct)) setProgress(pct);
            });
        }

        setCoreLoading(true);
        setCoreProgress(0);
        try {
            await ffmpeg.load({
                coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(
                    `${CORE_BASE}/ffmpeg-core.wasm`,
                    'application/wasm',
                    true,
                    ({ received, total }) => {
                        if (total > 0) setCoreProgress(Math.round((received / total) * 100));
                    },
                ),
            });
            setCoreReady(true);
            return ffmpeg;
        } finally {
            setCoreLoading(false);
        }
    }, []);

    const resetOutput = () => {
        if (outUrl) URL.revokeObjectURL(outUrl);
        setOutUrl(null);
        setOutName('');
        setOutSize(0);
        setProgress(0);
        setLogLine('');
    };

    const selectFile = (f: File | undefined | null) => {
        if (!f) return;
        if (converting) return;
        resetOutput();
        setFile(f);
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        selectFile(e.target.files?.[0]);
        e.target.value = '';
    };

    const handleConvert = async () => {
        if (!file || converting) return;
        resetOutput();
        cancelledRef.current = false;
        logBufRef.current = [];
        setConverting(true);
        setProgress(0);

        const inName = `input.${fileExt(file.name)}`;
        const outFileName = `output.${target.ext}`;
        try {
            const inputData = await fetchFile(file);
            const run = async (args: (i: string, o: string) => string[]) => {
                const ff = await ensureCore();
                await ff.writeFile(inName, inputData);
                const code = await ff.exec(args(inName, outFileName));
                if (code !== 0) throw new Error(`ffmpeg exited with code ${code}`);
                return ff;
            };

            let ffmpeg: FFmpeg;
            try {
                ffmpeg = await run(target.args);
            } catch (firstErr) {
                if (cancelledRef.current || !target.fallbackArgs) throw firstErr;
                // A wasm trap leaves the module in an undefined state: throw it
                // away and retry once on a fresh instance with conservative args.
                console.warn('First attempt failed, retrying with safe settings:', firstErr);
                ffmpegRef.current?.terminate();
                setCoreReady(false);
                setProgress(0);
                logBufRef.current = [];
                ffmpeg = await run(target.fallbackArgs);
            }

            const data = (await ffmpeg.readFile(outFileName)) as Uint8Array;
            if (!data || data.length === 0) throw new Error('Conversion produced an empty file.');

            const blob = new Blob([data as unknown as BlobPart], { type: target.mime });
            const url = URL.createObjectURL(blob);
            setOutUrl(url);
            setOutName(`${baseName(file.name)}.${target.ext}`);
            setOutSize(blob.size);
            setProgress(100);

            // Best-effort cleanup of the virtual FS.
            ffmpeg.deleteFile(inName).catch(() => { });
            ffmpeg.deleteFile(outFileName).catch(() => { });
        } catch (err) {
            // User-initiated cancel rejects the pending exec — not a real failure.
            if (cancelledRef.current) return;

            // The worker rejects with a plain value, not always an Error. The real
            // reason is in ffmpeg's stderr tail; surface it instead of "(undefined)".
            const reason = err instanceof Error ? err.message : String(err);
            const logTail = logBufRef.current
                .map((l) => l.trim())
                .filter(Boolean)
                .slice(-6);
            console.error('Conversion failed:', reason, '\nffmpeg log tail:\n' + logBufRef.current.join('\n'));

            // The module is likely corrupted after a trap; make the next run start clean.
            ffmpegRef.current?.terminate();
            setCoreReady(false);

            const trapped = /memory access out of bounds|abort|RuntimeError/i.test(
                reason + ' ' + logTail.join(' '),
            );
            const detail = logTail.length ? logTail.join(' · ') : reason || 'unknown error';
            const isLarge = file.size > 200 * 1024 * 1024;
            const hint = isLarge
                ? ` This file is ${formatBytes(file.size)} — in-browser conversion is memory-limited, so large or high-bitrate videos often exceed what it can handle. Try a shorter clip or a lower-resolution source.`
                : trapped
                    ? ` The converter engine crashed on this file (it is only ${formatBytes(file.size)}, so size is not the cause — likely an unsupported stream or codec feature). Try a different target format.`
                    : '';
            showError(
                'Conversion failed',
                `Could not convert "${file.name}" to ${target.label}.${hint}\n\nffmpeg: ${detail}`,
            );
        } finally {
            setConverting(false);
        }
    };

    const handleCancel = () => {
        if (!ffmpegRef.current) return;
        cancelledRef.current = true;
        // terminate() kills the worker and rejects the in-flight exec.
        ffmpegRef.current.terminate();
        setCoreReady(false);
        setConverting(false);
        setCoreLoading(false);
        setProgress(0);
        setLogLine('');
    };

    const TOO_LARGE = 600 * 1024 * 1024; // 600 MB — beyond this, OOM is likely.
    const busy = coreLoading || converting;

    return (
        <div className="min-h-screen w-full bg-[var(--background)] text-[var(--foreground)] overflow-x-hidden">
            <div className="max-w-[860px] mx-auto px-6 py-12">

                {/* ── Header ─────────────────────────────────── */}
                <div className="flex flex-col items-center text-center mb-10">
                    <div
                        className="flex items-center justify-center w-14 h-14 mb-4"
                        style={{ backgroundColor: 'rgba(245,150,28,0.12)', color: ORANGE, borderRadius: '16px' }}
                    >
                        <Film size={28} strokeWidth={1.75} />
                    </div>
                    <h1 className="font-audiowide text-3xl mb-3">Video Converter</h1>
                    <p className="font-lato text-sm text-[var(--muted-foreground)] max-w-[460px] leading-relaxed">
                        Convert video and audio to MP4 and more — powered by <a href="https://github.com/ffmpegwasm/ffmpeg.wasm" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline text-orange-400">ffmpeg.wasm</a>.
                        Everything runs in your browser; your files never leave your device.
                    </p>
                </div>

                {/* ── Dropzone ───────────────────────────────── */}
                <label
                    className="block border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition"
                    style={{
                        borderColor: dragState ? ORANGE : 'var(--border)',
                        backgroundColor: dragState ? 'rgba(245,150,28,0.08)' : 'var(--card)',
                        opacity: busy ? 0.6 : 1,
                        pointerEvents: busy ? 'none' : undefined,
                    }}
                    onDragEnter={(e) => { e.preventDefault(); setDragState(true); }}
                    onDragLeave={() => setDragState(false)}
                    onDragOver={(e) => { e.preventDefault(); setDragState(true); }}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragState(false);
                        selectFile(e.dataTransfer.files?.[0]);
                    }}
                >
                    {file ? (
                        <div className="flex flex-col items-center gap-1">
                            <FileVideo className="w-8 h-8 mb-1" style={{ color: ORANGE }} />
                            <span className="font-lato font-medium break-all">{file.name}</span>
                            <span className="font-jetbrains text-xs text-[var(--muted-foreground)]">
                                {formatBytes(file.size)} · click to replace
                            </span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-1">
                            <Upload className="w-8 h-8 mb-1" style={{ color: ORANGE }} />
                            <span className="font-lato font-medium">
                                {dragState ? 'Release to load file' : 'Click or drag a file here'}
                            </span>
                            <span className="font-jetbrains text-xs text-[var(--muted-foreground)]">
                                Video or audio · processed locally
                            </span>
                        </div>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*,audio/*"
                        onChange={handleInput}
                        className="hidden"
                        disabled={busy}
                    />
                </label>

                {/* Large-file warning — in-browser transcoding is memory-bound. */}
                {file && file.size > TOO_LARGE && (
                    <div
                        className="mt-3 flex items-start gap-2.5 px-4 py-3 rounded-xl"
                        style={{ backgroundColor: 'rgba(245,150,28,0.1)', border: '1px solid rgba(245,150,28,0.4)' }}
                    >
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: ORANGE }} />
                        <p className="font-lato text-xs text-[var(--foreground)] leading-relaxed text-left">
                            This file is <strong>{formatBytes(file.size)}</strong>. Conversion happens entirely
                            in a memory-limited browser sandbox, so large or high-bitrate videos (full-length
                            1080p movies/episodes) may run out of memory or take a very long time. Shorter clips
                            and lower resolutions convert reliably.
                        </p>
                    </div>
                )}

                {/* ── Target format ──────────────────────────── */}
                <div className="mt-8">
                    <p className="font-lato font-semibold text-xs uppercase tracking-wider mb-3">
                        Convert to
                    </p>
                    <div className={`grid gap-2 ${onMobile ? 'grid-cols-3' : 'grid-cols-7'}`}>
                        {FORMATS.map((f) => {
                            const active = f.ext === target.ext;
                            const Icon = f.kind === 'audio' ? Music : f.kind === 'image' ? ImageIcon : FileVideo;
                            return (
                                <button
                                    key={f.ext}
                                    onClick={() => setTarget(f)}
                                    disabled={busy}
                                    className="flex flex-col items-center gap-1.5 py-3 border transition disabled:opacity-50"
                                    style={{
                                        borderColor: active ? ORANGE : 'var(--border)',
                                        backgroundColor: active ? 'rgba(245,150,28,0.1)' : 'var(--card)',
                                        color: active ? ORANGE : 'var(--muted-foreground)',
                                        borderRadius: '12px',
                                    }}
                                >
                                    <Icon size={18} />
                                    <span className="font-jetbrains text-[11px] tracking-wide">{f.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Action ─────────────────────────────────── */}
                <div className="mt-8 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={handleConvert}
                            disabled={!file || busy}
                            className="flex items-center justify-center gap-2.5 px-8 py-3.5 font-audiowide text-sm tracking-wider flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed transition"
                            style={{ backgroundColor: ORANGE, color: '#1B2F5E', borderRadius: '10px' }}
                        >
                            {busy ? (
                                <>
                                    <LoaderCircle className="animate-spin" size={18} />
                                    {coreLoading ? 'Loading engine…' : 'Converting…'}
                                </>
                            ) : (
                                <>
                                    <Film size={18} />
                                    Convert to {target.label}
                                </>
                            )}
                        </button>
                        {busy && (
                            <button
                                onClick={handleCancel}
                                className="flex items-center justify-center gap-2 px-5 py-3.5 font-audiowide text-sm tracking-wider border transition"
                                style={{ borderColor: 'var(--border)', borderRadius: '10px', color: 'var(--foreground)' }}
                            >
                                <X size={18} />
                                Cancel
                            </button>
                        )}
                    </div>

                    {/* Engine download progress (first run only) */}
                    {coreLoading && (
                        <div className="w-full max-w-[460px]">
                            <div className="flex justify-between font-jetbrains text-[11px] text-[var(--muted-foreground)] mb-1">
                                <span>Downloading converter engine (first run only)</span>
                                <span>{coreProgress}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                                <div className="h-2 transition-all" style={{ width: `${coreProgress}%`, backgroundColor: ORANGE }} />
                            </div>
                        </div>
                    )}

                    {/* Conversion progress */}
                    {converting && !coreLoading && (
                        <div className="w-full max-w-[460px]">
                            <div className="flex justify-between font-jetbrains text-[11px] text-[var(--muted-foreground)] mb-1">
                                <span className="truncate pr-3">{logLine || 'Processing…'}</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                                <div className="h-2 transition-all" style={{ width: `${progress}%`, backgroundColor: ORANGE }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Result ─────────────────────────────────── */}
                {outUrl && (
                    <div
                        className="mt-10 p-6 border rounded-2xl flex flex-col items-center gap-4"
                        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}
                    >
                        {target.kind === 'video' && (
                            <video src={outUrl} controls className="max-h-[360px] w-full rounded-lg bg-black" />
                        )}
                        {target.kind === 'audio' && (
                            <audio src={outUrl} controls className="w-full" />
                        )}
                        {target.kind === 'image' && (
                            <img src={outUrl} alt={outName} className="max-h-[360px] rounded-lg" />
                        )}

                        <div className="flex flex-col items-center gap-1 text-center">
                            <span className="font-lato font-medium break-all">{outName}</span>
                            <span className="font-jetbrains text-xs text-[var(--muted-foreground)]">
                                {formatBytes(outSize)}
                            </span>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap justify-center">
                            <a
                                href={outUrl}
                                download={outName}
                                className="flex items-center gap-2 px-5 py-2.5 font-audiowide text-xs tracking-wider"
                                style={{ backgroundColor: ORANGE, color: '#1B2F5E', borderRadius: '10px' }}
                            >
                                <Download size={16} />
                                Download
                            </a>
                            <button
                                onClick={resetOutput}
                                className="flex items-center gap-2 px-5 py-2.5 font-audiowide text-xs tracking-wider border"
                                style={{ borderColor: 'var(--border)', borderRadius: '10px', color: 'var(--foreground)' }}
                            >
                                <RotateCcw size={16} />
                                Again
                            </button>
                        </div>
                    </div>
                )}

                {/* Clear selection */}
                {file && !outUrl && !busy && (
                    <div className="mt-4 flex justify-center">
                        <button
                            onClick={() => { setFile(null); resetOutput(); }}
                            className="flex items-center gap-1.5 font-jetbrains text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition"
                        >
                            <X size={14} /> Clear selection
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoConverterPage;
