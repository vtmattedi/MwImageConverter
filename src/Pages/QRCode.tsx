import React, { useState, useEffect, useMemo } from 'react';
import qrcode from 'qrcode-generator';
import { Download, Copy, Check } from 'lucide-react';
import Logo from '@/components/Logo';
import { useGlobals } from '@/Providers/Globals';

const ORANGE = '#F5961C';
const NAVY   = '#1B2F5E';

const ECL_LEVELS: { key: 'L' | 'M' | 'Q' | 'H'; pct: string }[] = [
    { key: 'L', pct: '7%'  },
    { key: 'M', pct: '15%' },
    { key: 'Q', pct: '25%' },
    { key: 'H', pct: '30%' },
];

const CORNERS = [
    'top-3 left-3 border-t border-l',
    'top-3 right-3 border-t border-r',
    'bottom-3 left-3 border-b border-l',
    'bottom-3 right-3 border-b border-r',
];

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
    const [dlHover, setDlHover] = useState(false);
    const [cpHover, setCpHover] = useState(false);

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
            setVersion(ver);
            setModules(count);
            setError('');
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to generate QR code.');
            setSvgStr(''); setModules(0); setVersion(0);
        }
    }, [text, ecl, fg, bg, margin, scale]);

    const byteLength = useMemo(() => new TextEncoder().encode(text).length, [text]);

    const download = () => {
        if (!svgStr) return;
        const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `qrcode-${Date.now()}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const copySvg = async () => {
        if (!svgStr) return;
        await navigator.clipboard.writeText(svgStr);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    // Download button: orange on hover → navy text for contrast; foreground bg otherwise
    const dlBg    = dlHover ? ORANGE              : 'var(--foreground)';
    const dlBdr   = dlHover ? ORANGE              : 'var(--foreground)';
    const dlColor = dlHover ? NAVY                : 'var(--background)';

    // Copy button (ghost): foreground bg on hover → background text; transparent otherwise
    const cpBg    = cpHover ? 'var(--foreground)' : 'transparent';
    const cpBdr   = 'var(--foreground)';
    const cpColor = cpHover ? 'var(--background)' : 'var(--foreground)';

    const sharedBtn = `flex items-center justify-center gap-2.5
        py-3.5 px-5 font-jetbrains text-xs tracking-[0.18em] uppercase cursor-pointer
        transition-all duration-150 border
        disabled:opacity-35 disabled:cursor-not-allowed`;

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
            <div className={`max-w-[1100px] mx-auto pb-16 pt-10 ${onMobile ? 'px-4' : 'px-7'}`}>

                {/* ── Page header ─────────────────────────────── */}
                <header className="flex items-end justify-between pb-5 border-b border-[var(--border)]">
                    <div className="flex items-end gap-4">
                        <Logo className="h-11 w-11 shrink-0" style={{ color: 'var(--foreground)' }} />
                        <div>
                            <h1
                                className="font-audiowide m-0 leading-none tracking-tight"
                                style={{ fontSize: 'clamp(28px, 5vw, 52px)' }}
                            >
                                QR <span style={{ color: ORANGE }}>Studio</span>
                            </h1>
                            <i className="font-lato text-sm text-[var(--muted-foreground)]">
                                by mattediworks &copy;
                            </i>
                        </div>
                    </div>
                    <div className="text-right font-jetbrains text-[10px] tracking-[0.14em] uppercase text-[var(--muted-foreground)] leading-relaxed hidden md:block">
                        <div>
                            <span
                                className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 relative top-px"
                                style={{ backgroundColor: ORANGE }}
                            />
                            Static Generator
                        </div>
                        <div>v1.0 · svg export</div>
                    </div>
                </header>

                {/* ── Ledger bar ───────────────────────────────── */}
                <div className="flex justify-between items-center py-2 border-b border-[var(--border)] font-jetbrains text-[10px] tracking-[0.16em] uppercase text-[var(--muted-foreground)]">
                    <span>Output · SVG</span>
                    <span className="hidden sm:inline">Encoding · UTF-8</span>
                    <span>Privacy · Client-side only</span>
                </div>

                {/* ── Main grid ────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-12 pt-10">

                    {/* Controls */}
                    <section>
                        <h2 className="font-jetbrains text-[10px] tracking-[0.22em] uppercase text-[var(--muted-foreground)] mb-4 flex items-center gap-2.5">
                            <span className="w-5 h-px bg-[var(--foreground)] shrink-0" />
                            Settings
                        </h2>

                        {/* Content textarea */}
                        <div className="mb-5">
                            <label className="flex justify-between items-baseline font-jetbrains text-[11px] tracking-[0.14em] uppercase text-[var(--muted-foreground)] mb-2">
                                <span>Content</span>
                                <span className="text-[10px] tracking-normal normal-case">{byteLength} bytes</span>
                            </label>
                            <textarea
                                value={text}
                                onChange={e => setText(e.target.value)}
                                placeholder="URL, phone number, plain text, vCard…"
                                spellCheck={false}
                                className="w-full bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] p-3 font-jetbrains text-[13px] leading-[1.55] resize-y outline-none min-h-[88px] transition-all placeholder:text-[var(--muted-foreground)]"
                                style={{ borderRadius: '8px' }}
                            />
                        </div>

                        {/* Error correction level */}
                        <div className="mb-5">
                            <label className="flex justify-between items-baseline font-jetbrains text-[11px] tracking-[0.14em] uppercase text-[var(--muted-foreground)] mb-2">
                                <span>Error correction</span>
                                <span className="text-[10px] normal-case">damage recovery</span>
                            </label>
                            <div
                                className="grid grid-cols-4 border border-[var(--border)] overflow-hidden"
                                style={{ borderRadius: '8px' }}
                            >
                                {ECL_LEVELS.map(l => {
                                    const active = ecl === l.key;
                                    return (
                                        <button
                                            key={l.key}
                                            type="button"
                                            onClick={() => setEcl(l.key)}
                                            className="border-r border-[var(--border)] last:border-r-0 py-3 font-jetbrains text-xs cursor-pointer transition-colors text-center"
                                            style={{
                                                backgroundColor: active ? 'var(--foreground)' : 'var(--card)',
                                                color: active ? 'var(--background)' : 'var(--foreground)',
                                            }}
                                        >
                                            {l.key}
                                            <span
                                                className="block text-[9px] tracking-wider mt-0.5"
                                                style={{
                                                    color: active ? 'var(--background)' : 'var(--muted-foreground)',
                                                    opacity: active ? 0.6 : 1,
                                                }}
                                            >
                                                {l.pct}
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
                                    <label className="block font-jetbrains text-[11px] tracking-[0.14em] uppercase text-[var(--muted-foreground)] mb-2">
                                        {label}
                                    </label>
                                    <div
                                        className="flex items-center gap-2.5 border border-[var(--border)] bg-[var(--card)] p-1.5 pr-2.5"
                                        style={{ borderRadius: '8px' }}
                                    >
                                        <span
                                            className="w-[28px] h-[28px] border border-[var(--border)] relative overflow-hidden shrink-0"
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
                                            className="border-none bg-transparent p-1 font-jetbrains text-xs text-[var(--foreground)] outline-none w-full"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Sliders */}
                        {([
                            { label: 'Quiet zone', hint: 'modules',    min: 0, max: 10, value: margin, set: setMargin },
                            { label: 'Scale',      hint: 'px / module', min: 2, max: 20, value: scale,  set: setScale  },
                        ] as const).map(({ label, hint, min, max, value, set }) => (
                            <div key={label} className="mb-5">
                                <label className="flex justify-between font-jetbrains text-[11px] tracking-[0.14em] uppercase text-[var(--muted-foreground)] mb-2">
                                    <span>{label}</span>
                                    <span className="text-[10px] normal-case">{hint}</span>
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min={min} max={max} step={1}
                                        value={value}
                                        onChange={e => set(parseInt(e.target.value, 10))}
                                        className="flex-1 cursor-pointer accent-orange-400"
                                    />
                                    <span className="font-jetbrains text-xs text-[var(--foreground)] min-w-[32px] text-right tabular-nums">
                                        {String(value).padStart(2, '0')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </section>

                    {/* Preview */}
                    <section className="flex flex-col">
                        <h2 className="font-jetbrains text-[10px] tracking-[0.22em] uppercase text-[var(--muted-foreground)] mb-4 flex items-center gap-2.5">
                            <span className="w-5 h-px bg-[var(--foreground)] shrink-0" />
                            Preview
                        </h2>

                        {/* QR paper */}
                        <div
                            className="bg-[var(--card)] border border-[var(--border)] p-9 relative aspect-square flex items-center justify-center"
                            style={{
                                borderRadius: '16px 16px 0 0',
                                boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
                            }}
                        >
                            {CORNERS.map((cls, i) => (
                                <span key={i} className={`absolute w-3.5 h-3.5 border-[var(--border)] pointer-events-none ${cls}`} />
                            ))}
                            <div className="w-full h-full flex items-center justify-center">
                                {error ? (
                                    <p className="text-center font-jetbrains text-xs p-4 leading-relaxed" style={{ color: ORANGE }}>
                                        ⚠ {error}
                                    </p>
                                ) : svgStr ? (
                                    <div
                                        style={{ width: '100%', height: '100%', display: 'flex' }}
                                        dangerouslySetInnerHTML={{ __html: svgStr }}
                                    />
                                ) : (
                                    <p className="text-center text-[var(--muted-foreground)] font-jetbrains text-xs tracking-widest">
                                        — enter content —
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Stats bar — rounded bottom, flush with QR paper */}
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
                                    className="border-r border-[var(--border)] last:border-r-0 p-3.5 bg-[var(--card)]"
                                    style={{
                                        borderRadius: idx === arr.length - 1 ? '0 0 12px 0' : idx === 0 ? '0 0 0 12px' : undefined,
                                    }}
                                >
                                    <div className="font-jetbrains text-[9px] tracking-[0.18em] uppercase text-[var(--muted-foreground)] mb-1.5">{k}</div>
                                    <div className="font-audiowide text-xl leading-none text-[var(--foreground)]">
                                        {v}
                                        {s && <small className="font-lato text-[11px] text-[var(--muted-foreground)] ml-1 font-normal">{s}</small>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={download}
                                disabled={!svgStr}
                                onMouseEnter={() => setDlHover(true)}
                                onMouseLeave={() => setDlHover(false)}
                                className={`flex-1 ${sharedBtn}`}
                                style={{
                                    backgroundColor: dlBg,
                                    borderColor: dlBdr,
                                    color: dlColor,
                                    borderRadius: '8px',
                                    transform: (dlHover && svgStr) ? 'translateY(-2px)' : undefined,
                                    boxShadow: (dlHover && svgStr) ? `0 6px 20px rgba(245,150,28,0.35)` : undefined,
                                }}
                            >
                                <Download size={13} />
                                Download SVG
                            </button>
                            <button
                                onClick={copySvg}
                                disabled={!svgStr}
                                onMouseEnter={() => setCpHover(true)}
                                onMouseLeave={() => setCpHover(false)}
                                className={`flex-none ${sharedBtn}`}
                                style={{
                                    backgroundColor: cpBg,
                                    borderColor: cpBdr,
                                    color: cpColor,
                                    borderRadius: '8px',
                                    transform: (cpHover && svgStr) ? 'translateY(-2px)' : undefined,
                                    boxShadow: (cpHover && svgStr) ? '0 4px 12px rgba(0,0,0,0.12)' : undefined,
                                }}
                            >
                                {copied ? <Check size={13} /> : <Copy size={13} />}
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <footer className="mt-14 pt-4 border-t border-[var(--border)] flex justify-between font-jetbrains text-[10px] tracking-[0.16em] uppercase text-[var(--muted-foreground)]">
                    <span>&copy; Mattediworks</span>
                    <span>No data leaves this page</span>
                </footer>
            </div>
        </div>
    );
};

export default QRCodePage;
