import React, { useState, useEffect, useMemo } from 'react';
import qrcode from 'qrcode-generator';
import { Download, Copy, Check } from 'lucide-react';
import Logo from '@/components/Logo';
import { useGlobals } from '@/Providers/Globals';

const ECL_LEVELS: { key: 'L' | 'M' | 'Q' | 'H'; pct: string; label: string }[] = [
    { key: 'L', pct: '7%',  label: 'Low' },
    { key: 'M', pct: '15%', label: 'Med' },
    { key: 'Q', pct: '25%', label: 'Qtr' },
    { key: 'H', pct: '30%', label: 'High' },
];

const CORNERS = [
    'top-2.5 left-2.5 border-t border-l',
    'top-2.5 right-2.5 border-t border-r',
    'bottom-2.5 left-2.5 border-b border-l',
    'bottom-2.5 right-2.5 border-b border-r',
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
    // Track hover state manually so we can override the global dark:text-white rule
    const [dlHover, setDlHover]   = useState(false);
    const [cpHover, setCpHover]   = useState(false);

    // Sync QR defaults when theme changes
    useEffect(() => {
        setFg(theme === 'dark' ? '#ffffff' : '#1a1a1a');
        setBg(theme === 'dark' ? '#111111' : '#ffffff');
    }, [theme]);

    // Generate QR SVG
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

    // Colours for the two action buttons — computed so inline style always wins
    // over the global `button { dark:text-white }` rule.
    const dlBg    = dlHover ? '#ff9849'               : 'var(--foreground)';
    const dlBdr   = dlHover ? '#ff9849'               : 'var(--foreground)';
    const dlColor = 'var(--background)';                 // always contrast on foreground bg

    const cpBg    = cpHover ? 'var(--foreground)'     : 'transparent';
    const cpBdr   = 'var(--foreground)';
    const cpColor = cpHover ? 'var(--background)'     : 'var(--foreground)';

    const sharedBtn = `flex items-center justify-center gap-2.5
        py-3.5 px-5 font-jetbrains text-xs tracking-[0.18em] uppercase cursor-pointer
        transition-all duration-150 border
        disabled:opacity-35 disabled:cursor-not-allowed`;

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
            <div className={`max-w-[1100px] mx-auto pb-16 pt-10 ${onMobile ? 'px-4' : 'px-7'}`}>

                {/* ── Page header ─────────────────────────────── */}
                <header className="flex items-end justify-between pb-5 border-b border-[var(--foreground)]">
                    <div className="flex items-end gap-4">
                        <Logo className="h-11 w-11 shrink-0" style={{ color: 'var(--foreground)' }} />
                        <div>
                            <h1
                                className="font-audiowide m-0 leading-none tracking-tight"
                                style={{ fontSize: 'clamp(28px, 5vw, 52px)' }}
                            >
                                QR <span style={{ color: '#ff9849' }}>Studio</span>
                            </h1>
                            <i className="font-lato text-sm text-[var(--muted-foreground)]">
                                by mattediworks &copy;
                            </i>
                        </div>
                    </div>
                    <div className="text-right font-jetbrains text-[10px] tracking-[0.14em] uppercase text-[var(--muted-foreground)] leading-relaxed hidden md:block">
                        <div>
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ff9849] mr-1.5 relative top-px" />
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

                        {/* Content */}
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
                                className="w-full bg-[var(--card)] border border-[var(--foreground)] text-[var(--foreground)] p-3 font-jetbrains text-[13px] leading-[1.55] resize-y outline-none min-h-[88px] transition-all placeholder:text-[var(--muted-foreground)] focus:shadow-[3px_3px_0_var(--foreground)] focus:-translate-x-px focus:-translate-y-px"
                            />
                        </div>

                        {/* Error correction level */}
                        <div className="mb-5">
                            <label className="flex justify-between items-baseline font-jetbrains text-[11px] tracking-[0.14em] uppercase text-[var(--muted-foreground)] mb-2">
                                <span>Error correction</span>
                                <span className="text-[10px] normal-case">damage recovery</span>
                            </label>
                            <div className="grid grid-cols-4 border border-[var(--foreground)]">
                                {ECL_LEVELS.map(l => {
                                    const active = ecl === l.key;
                                    return (
                                        <button
                                            key={l.key}
                                            type="button"
                                            onClick={() => setEcl(l.key)}
                                            className="border-r border-[var(--foreground)] last:border-r-0 py-3 font-jetbrains text-xs cursor-pointer transition-colors text-center"
                                            style={{
                                                backgroundColor: active ? 'var(--foreground)' : 'var(--card)',
                                                // inline style wins over global dark:text-white
                                                color: active ? 'var(--background)' : 'var(--foreground)',
                                            }}
                                        >
                                            {l.key}
                                            <span
                                                className="block text-[9px] tracking-wider mt-0.5"
                                                style={{ color: active ? 'var(--background)' : 'var(--muted-foreground)', opacity: active ? 0.6 : 1 }}
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
                                    <div className="flex items-center gap-2.5 border border-[var(--foreground)] bg-[var(--card)] p-1.5 pr-2.5">
                                        <span
                                            className="w-[28px] h-[28px] border border-[var(--foreground)] relative overflow-hidden shrink-0"
                                            style={{ background: value }}
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
                            { label: 'Quiet zone', hint: 'modules', min: 0, max: 10, value: margin, set: setMargin },
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
                                        className="flex-1 cursor-pointer accent-[#ff9849]"
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
                        <div className="bg-[var(--card)] border border-[var(--foreground)] p-9 relative aspect-square flex items-center justify-center shadow-[6px_6px_0_var(--foreground)]">
                            {CORNERS.map((cls, i) => (
                                <span key={i} className={`absolute w-3.5 h-3.5 border-[var(--foreground)] pointer-events-none ${cls}`} />
                            ))}
                            <div className="w-full h-full flex items-center justify-center">
                                {error ? (
                                    <p className="text-center font-jetbrains text-xs p-4 leading-relaxed" style={{ color: '#ff9849' }}>
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

                        {/* Stats bar */}
                        <div className="grid grid-cols-3 border border-t-0 border-[var(--foreground)]">
                            {[
                                { k: 'Version', v: version || '—', s: version ? '/40' : '' },
                                { k: 'Modules', v: modules || '—', s: modules ? '²'  : '' },
                                { k: 'Level',   v: ecl,           s: ''               },
                            ].map(({ k, v, s }) => (
                                <div key={k} className="border-r border-[var(--foreground)] last:border-r-0 p-3.5 bg-[var(--card)]">
                                    <div className="font-jetbrains text-[9px] tracking-[0.18em] uppercase text-[var(--muted-foreground)] mb-1.5">{k}</div>
                                    <div className="font-audiowide text-xl leading-none text-[var(--foreground)]">
                                        {v}
                                        {s && <small className="font-lato text-[11px] text-[var(--muted-foreground)] ml-1 font-normal">{s}</small>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Action buttons — inline style for color so global dark:text-white is overridden */}
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
                                    transform: (dlHover && svgStr) ? 'translate(-2px,-2px)' : undefined,
                                    boxShadow: (dlHover && svgStr) ? '4px 4px 0 var(--foreground)' : undefined,
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
                                    transform: (cpHover && svgStr) ? 'translate(-2px,-2px)' : undefined,
                                    boxShadow: (cpHover && svgStr) ? '4px 4px 0 var(--foreground)' : undefined,
                                }}
                            >
                                {copied ? <Check size={13} /> : <Copy size={13} />}
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <footer className="mt-14 pt-4 border-t border-[var(--foreground)] flex justify-between font-jetbrains text-[10px] tracking-[0.16em] uppercase text-[var(--muted-foreground)]">
                    <span>&copy; Mattediworks</span>
                    <span>No data leaves this page</span>
                </footer>
            </div>
        </div>
    );
};

export default QRCodePage;
