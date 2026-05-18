import React, { useState, useEffect, useMemo } from 'react';
import qrcode from 'qrcode-generator';
import { Download, ImageDown, Copy, Check } from 'lucide-react';
import { useGlobals } from '@/Providers/Globals';

const ORANGE = '#F5961C';
const NAVY   = '#1B2F5E';

const ECL_LEVELS: { key: 'L' | 'M' | 'Q' | 'H'; label: string; pct: string; desc: string }[] = [
    { key: 'L', label: 'Low',  pct: '7%',  desc: 'Smallest code' },
    { key: 'M', label: 'Med',  pct: '15%', desc: 'Recommended'   },
    { key: 'Q', label: 'Qtr',  pct: '25%', desc: 'Good balance'  },
    { key: 'H', label: 'High', pct: '30%', desc: 'Most robust'   },
];

const CORNERS = [
    'top-3 left-3 border-t border-l',
    'top-3 right-3 border-t border-r',
    'bottom-3 left-3 border-b border-l',
    'bottom-3 right-3 border-b border-r',
];

/* ── Shared reusable bits ──────────────────────────────── */

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="flex items-center gap-3 mb-5">
        <span
            className="w-1 h-5 shrink-0"
            style={{ backgroundColor: ORANGE, borderRadius: '2px' }}
        />
        <span className="font-lato font-semibold text-sm text-[var(--foreground)] tracking-wide uppercase">
            {children}
        </span>
    </h2>
);

const FieldLabel: React.FC<{ label: string; hint?: string }> = ({ label, hint }) => (
    <div className="flex justify-between items-baseline mb-2">
        <span className="font-lato font-semibold text-xs uppercase tracking-wider text-[var(--foreground)]">
            {label}
        </span>
        {hint && (
            <span className="font-inter text-xs text-[var(--muted-foreground)]">{hint}</span>
        )}
    </div>
);

/* ── Page component ────────────────────────────────────── */

const QRCodePage: React.FC = () => {
    const { theme, onMobile } = useGlobals();

    const [text, setText]       = useState('https://github.com/vtmattedi');
    const [ecl, setEcl]         = useState<'L' | 'M' | 'Q' | 'H'>('M');
    const [fg, setFg]           = useState('#1a1a1a');
    const [bg, setBg]           = useState('#ffffff');
    const [margin, setMargin]   = useState(2);
    const [scale, setScale]     = useState(8);
    const [svgStr, setSvgStr]   = useState('');
    const [modules, setModules] = useState(0);
    const [version, setVersion] = useState(0);
    const [error, setError]     = useState('');
    const [copied, setCopied]   = useState(false);

    // Hover states — inline style overrides the global `button { dark:text-white }` rule
    const [dlHover,  setDlHover]  = useState(false);
    const [pngHover, setPngHover] = useState(false);
    const [cpHover,  setCpHover]  = useState(false);
    const [eclHover, setEclHover] = useState<string | null>(null);
    const [txFocus,  setTxFocus]  = useState(false);

    useEffect(() => {
        setFg(theme === 'dark' ? '#ffffff' : '#1a1a1a');
        setBg(theme === 'dark' ? '#111111' : '#ffffff');
    }, [theme]);

    useEffect(() => {
        const value = text.trim();
        if (!value) {
            setSvgStr(''); setError(''); setModules(0); setVersion(0);
            return;
        }
        try {
            const qr = qrcode(0, ecl);
            qr.addData(value);
            qr.make();

            const count  = qr.getModuleCount();
            const ver    = (count - 17) / 4;
            const sizePx = (count + margin * 2) * scale;

            let path = '';
            for (let r = 0; r < count; r++) {
                for (let c = 0; c < count; c++) {
                    if (qr.isDark(r, c)) {
                        const x = (c + margin) * scale;
                        const y = (r + margin) * scale;
                        path += `M${x},${y}h${scale}v${scale}h-${scale}z`;
                    }
                }
            }
            setSvgStr(
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sizePx} ${sizePx}" shape-rendering="crispEdges">` +
                `<rect width="${sizePx}" height="${sizePx}" fill="${bg}"/>` +
                `<path d="${path}" fill="${fg}"/>` +
                `</svg>`
            );
            setVersion(ver); setModules(count); setError('');
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to generate QR code.');
            setSvgStr(''); setModules(0); setVersion(0);
        }
    }, [text, ecl, fg, bg, margin, scale]);

    const byteLength = useMemo(() => new TextEncoder().encode(text).length, [text]);

    /* ── Download helpers ──────────────────────────────── */

    const download = () => {
        if (!svgStr) return;
        const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `qrcode-${Date.now()}.svg`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    };

    const downloadPng = () => {
        if (!svgStr) return;
        const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl  = URL.createObjectURL(svgBlob);
        const img     = new Image();
        img.onload = () => {
            const size   = img.naturalWidth;
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = size * 2;
            const ctx = canvas.getContext('2d');
            if (!ctx) { URL.revokeObjectURL(svgUrl); return; }
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(svgUrl);
            canvas.toBlob(pngBlob => {
                if (!pngBlob) return;
                const pngUrl = URL.createObjectURL(pngBlob);
                const a = document.createElement('a');
                a.href = pngUrl; a.download = `qrcode-${Date.now()}.png`;
                document.body.appendChild(a); a.click();
                document.body.removeChild(a); URL.revokeObjectURL(pngUrl);
            }, 'image/png');
        };
        img.src = svgUrl;
    };

    const copySvg = async () => {
        if (!svgStr) return;
        await navigator.clipboard.writeText(svgStr);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    /* ── Button colour logic (inline wins over dark:text-white) ── */

    // SVG: orange always, navy text — hover lifts
    const dlBg    = ORANGE;
    const dlColor = NAVY;
    const dlShadow = (dlHover && svgStr) ? `0 6px 22px rgba(245,150,28,0.45)` : '0 2px 8px rgba(245,150,28,0.2)';
    const dlTransform = (dlHover && svgStr) ? 'translateY(-2px)' : undefined;

    // PNG: navy always, white text — hover brightens
    const pngBg    = pngHover ? '#2d5aa3' : NAVY;
    const pngColor = '#ffffff';
    const pngShadow = (pngHover && svgStr) ? '0 6px 22px rgba(27,47,94,0.4)' : '0 2px 8px rgba(27,47,94,0.15)';
    const pngTransform = (pngHover && svgStr) ? 'translateY(-2px)' : undefined;

    // Copy: ghost
    const cpBg    = cpHover ? 'var(--foreground)' : 'transparent';
    const cpBdr   = 'var(--foreground)';
    const cpColor = cpHover ? 'var(--background)' : 'var(--foreground)';

    const sharedBtn = `flex items-center justify-center gap-2 py-3 px-4
        font-lato font-semibold text-xs tracking-wider uppercase cursor-pointer
        transition-all duration-150 border-0
        disabled:opacity-35 disabled:cursor-not-allowed`;

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
            <div className={`max-w-[1100px] mx-auto pb-16 pt-8 ${onMobile ? 'px-4' : 'px-7'}`}>

                {/* ── Page title bar ─────────────────────────── */}
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-[var(--border)]">
                    <h1 className="font-audiowide text-2xl leading-none">
                        QR <span style={{ color: ORANGE }}>Studio</span>
                    </h1>
                    <div className="hidden sm:flex items-center gap-4 font-inter text-xs text-[var(--muted-foreground)]">
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ORANGE }} />
                            SVG &amp; PNG export
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--border)]" />
                            Client-side only
                        </span>
                    </div>
                </div>

                {/* ── Main grid ──────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-12">

                    {/* ── Controls ───────────────────────────── */}
                    <section>
                        <SectionTitle>Settings</SectionTitle>

                        {/* Content textarea */}
                        <div className="mb-5">
                            <FieldLabel label="Content" hint={`${byteLength} bytes`} />
                            <textarea
                                value={text}
                                onChange={e => setText(e.target.value)}
                                onFocus={() => setTxFocus(true)}
                                onBlur={() => setTxFocus(false)}
                                placeholder="URL, phone number, plain text, vCard…"
                                spellCheck={false}
                                className="w-full bg-[var(--card)] text-[var(--foreground)] p-3 font-jetbrains text-sm leading-relaxed resize-y outline-none min-h-[88px] transition-all placeholder:text-[var(--muted-foreground)] border"
                                style={{
                                    borderRadius: '8px',
                                    borderColor: txFocus ? ORANGE : 'var(--border)',
                                    boxShadow: txFocus ? `0 0 0 3px rgba(245,150,28,0.15)` : undefined,
                                }}
                            />
                        </div>

                        {/* Error correction level */}
                        <div className="mb-5">
                            <FieldLabel label="Error correction" hint="damage recovery" />
                            <div
                                className="grid grid-cols-4 overflow-hidden border border-[var(--border)]"
                                style={{ borderRadius: '10px' }}
                            >
                                {ECL_LEVELS.map(l => {
                                    const active  = ecl === l.key;
                                    const hovered = eclHover === l.key && !active;
                                    return (
                                        <button
                                            key={l.key}
                                            type="button"
                                            onClick={() => setEcl(l.key)}
                                            onMouseEnter={() => setEclHover(l.key)}
                                            onMouseLeave={() => setEclHover(null)}
                                            className="border-r border-[var(--border)] last:border-r-0 py-3 px-1 font-lato cursor-pointer transition-colors text-center"
                                            style={{
                                                backgroundColor: active
                                                    ? ORANGE
                                                    : hovered
                                                        ? 'rgba(245,150,28,0.1)'
                                                        : 'var(--card)',
                                                color: active ? NAVY : 'var(--foreground)',
                                            }}
                                        >
                                            <span
                                                className="block font-bold text-sm leading-tight"
                                                style={{ color: active ? NAVY : 'var(--foreground)' }}
                                            >
                                                {l.key}
                                            </span>
                                            <span
                                                className="block text-[10px] mt-0.5 font-normal leading-tight"
                                                style={{ color: active ? NAVY : 'var(--muted-foreground)', opacity: active ? 0.75 : 1 }}
                                            >
                                                {l.pct}
                                            </span>
                                            <span
                                                className="block text-[9px] mt-0.5 leading-tight hidden sm:block"
                                                style={{ color: active ? NAVY : 'var(--muted-foreground)', opacity: active ? 0.6 : 0.8 }}
                                            >
                                                {l.desc}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Colors */}
                        <div className="grid grid-cols-2 gap-3.5 mb-5">
                            {([
                                { label: 'Foreground', value: fg, set: setFg },
                                { label: 'Background', value: bg, set: setBg },
                            ] as const).map(({ label, value, set }) => (
                                <div key={label}>
                                    <FieldLabel label={label} />
                                    <div
                                        className="flex items-center gap-2.5 border border-[var(--border)] bg-[var(--card)] p-1.5 pr-2.5"
                                        style={{ borderRadius: '8px' }}
                                    >
                                        <span
                                            className="w-7 h-7 border border-[var(--border)] relative overflow-hidden shrink-0"
                                            style={{ background: value, borderRadius: '5px' }}
                                        >
                                            <input
                                                type="color"
                                                value={value}
                                                onChange={e => set(e.target.value)}
                                                className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] border-none p-0 cursor-pointer opacity-0"
                                            />
                                        </span>
                                        <input
                                            type="text"
                                            value={value}
                                            onChange={e => set(e.target.value)}
                                            className="border-none bg-transparent font-jetbrains text-xs text-[var(--foreground)] outline-none w-full"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Sliders */}
                        {([
                            { label: 'Quiet zone', hint: 'modules',     min: 0, max: 10, value: margin, set: setMargin },
                            { label: 'Scale',      hint: 'px / module', min: 2, max: 20, value: scale,  set: setScale  },
                        ] as const).map(({ label, hint, min, max, value, set }) => (
                            <div key={label} className="mb-5">
                                <FieldLabel label={label} hint={hint} />
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min={min} max={max} step={1}
                                        value={value}
                                        onChange={e => set(parseInt(e.target.value, 10))}
                                        className="flex-1 cursor-pointer accent-orange-400"
                                    />
                                    <span
                                        className="font-jetbrains text-sm text-[var(--foreground)] min-w-[32px] text-right tabular-nums font-medium"
                                        style={{ color: ORANGE }}
                                    >
                                        {String(value).padStart(2, '0')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </section>

                    {/* ── Preview ────────────────────────────── */}
                    <section className="flex flex-col">
                        <SectionTitle>Preview</SectionTitle>

                        {/* QR paper */}
                        <div
                            className="bg-[var(--card)] border border-[var(--border)] p-9 relative aspect-square flex items-center justify-center"
                            style={{
                                borderRadius: '16px 16px 0 0',
                                boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
                            }}
                        >
                            {CORNERS.map((cls, i) => (
                                <span
                                    key={i}
                                    className={`absolute w-3.5 h-3.5 pointer-events-none ${cls}`}
                                    style={{ borderColor: ORANGE }}
                                />
                            ))}
                            <div className="w-full h-full flex items-center justify-center">
                                {error ? (
                                    <p className="text-center font-inter text-sm p-4 leading-relaxed" style={{ color: ORANGE }}>
                                        ⚠ {error}
                                    </p>
                                ) : svgStr ? (
                                    <div
                                        style={{ width: '100%', height: '100%', display: 'flex' }}
                                        dangerouslySetInnerHTML={{ __html: svgStr }}
                                    />
                                ) : (
                                    <p className="text-center text-[var(--muted-foreground)] font-inter text-sm">
                                        — enter content —
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Stats bar */}
                        <div
                            className="grid grid-cols-3 border border-t-0 border-[var(--border)]"
                            style={{ borderRadius: '0 0 12px 12px' }}
                        >
                            {[
                                { k: 'Version', v: version || '—', s: version ? '/40' : '' },
                                { k: 'Modules', v: modules || '—', s: modules ? '²'  : '' },
                                { k: 'Level',   v: ecl,           s: ''               },
                            ].map(({ k, v, s }, idx, arr) => (
                                <div
                                    key={k}
                                    className="border-r border-[var(--border)] last:border-r-0 px-4 py-3 bg-[var(--card)]"
                                    style={{
                                        borderRadius: idx === 0 ? '0 0 0 12px' : idx === arr.length - 1 ? '0 0 12px 0' : undefined,
                                    }}
                                >
                                    <div className="font-lato text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                                        {k}
                                    </div>
                                    <div className="font-audiowide text-xl leading-none text-[var(--foreground)]">
                                        {v}
                                        {s && (
                                            <small className="font-lato text-xs text-[var(--muted-foreground)] ml-1 font-normal">
                                                {s}
                                            </small>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2.5 mt-4">
                            {/* SVG — orange brand pill */}
                            <button
                                onClick={download}
                                disabled={!svgStr}
                                onMouseEnter={() => setDlHover(true)}
                                onMouseLeave={() => setDlHover(false)}
                                className={`flex-1 ${sharedBtn}`}
                                style={{
                                    backgroundColor: dlBg,
                                    color: dlColor,
                                    borderRadius: '8px',
                                    transform: dlTransform,
                                    boxShadow: dlShadow,
                                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                }}
                            >
                                <Download size={14} />
                                Download SVG
                            </button>

                            {/* PNG — navy brand pill */}
                            <button
                                onClick={downloadPng}
                                disabled={!svgStr}
                                onMouseEnter={() => setPngHover(true)}
                                onMouseLeave={() => setPngHover(false)}
                                className={`flex-1 ${sharedBtn}`}
                                style={{
                                    backgroundColor: pngBg,
                                    color: pngColor,
                                    borderRadius: '8px',
                                    transform: pngTransform,
                                    boxShadow: pngShadow,
                                    transition: 'transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease',
                                }}
                            >
                                <ImageDown size={14} />
                                Download PNG
                            </button>

                            {/* Copy SVG source — ghost */}
                            <button
                                onClick={copySvg}
                                disabled={!svgStr}
                                onMouseEnter={() => setCpHover(true)}
                                onMouseLeave={() => setCpHover(false)}
                                className={`flex-none px-3.5 ${sharedBtn} border`}
                                style={{
                                    backgroundColor: cpBg,
                                    borderColor: cpBdr,
                                    color: cpColor,
                                    borderRadius: '8px',
                                    transition: 'background-color 0.15s ease, color 0.15s ease',
                                }}
                                title="Copy SVG source"
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <footer className="mt-14 pt-4 border-t border-[var(--border)] flex justify-between font-inter text-xs text-[var(--muted-foreground)]">
                    <span>&copy; MattediWorks</span>
                    <span>No data leaves this page</span>
                </footer>
            </div>
        </div>
    );
};

export default QRCodePage;
