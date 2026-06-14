import React from 'react';
import { useNavigate } from 'react-router';
import { FileImage, QrCode, Film, ArrowRight, Zap, Shield, UserX } from 'lucide-react';
import Logo from '@/components/Logo';
import { useGlobals } from '@/Providers/Globals';

const TOOLS = [
    {
        icon: FileImage,
        title: 'Image Converter',
        route: '/converter',
        badge: 'WebP',
        description:
            'Convert JPG, PNG, HEIC and more to high-quality WebP in seconds. Drag, drop, and download — all processing happens locally, no server involved.',
        cta: 'Convert images',
    },
    {
        icon: Film,
        title: 'Video Converter',
        route: '/video',
        badge: 'MP4',
        description:
            'Transcode video and audio between MP4, WebM, GIF, MP3 and more with ffmpeg.wasm. No uploads, no installs — the whole conversion runs inside your browser tab.',
        cta: 'Convert video',
    },
    {
        icon: QrCode,
        title: 'QR Studio',
        route: '/qrcode',
        badge: 'SVG',
        description:
            'Generate clean, scannable QR codes for any URL, text or contact card. Customise colors, margin and scale, then export as a crisp, scalable SVG.',
        cta: 'Generate QR codes',
    },
];

const PILLARS = [
    {
        icon: Zap,
        label: 'Always free',
        desc: 'Every tool on this site is free, forever. No premium tier, no feature paywalls, no "upgrade to unlock" — just open and use.',
    },
    {
        icon: Shield,
        label: 'Stays in your browser',
        desc: 'All processing runs locally in your tab. Your files and data never touch a server — what you do here stays on your machine.',
    },
    {
        icon: UserX,
        label: 'No account needed',
        desc: 'No email. No password. No confirmation link. Open a tool and start working in under a second.',
    },
];

const Landing: React.FC = () => {
    const navigate = useNavigate();
    const { onMobile } = useGlobals();
    const [hoveredTool, setHoveredTool] = React.useState<string | null>(null);
    const [ctaHovered, setCtaHovered] = React.useState(false);

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] overflow-x-hidden">

            {/* ── Hero ─────────────────────────────────────────── */}
            <section className="relative flex flex-col items-center justify-center text-center overflow-hidden px-6 pt-20 pb-32">

                {/* Orange radial bloom */}
                <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background:
                            'radial-gradient(ellipse 100% 60% at 50% -8%, rgba(255,152,73,0.18) 0%, transparent 65%)',
                    }}
                />

                {/* Subtle dot grid */}
                <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage:
                            'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
                        backgroundSize: '28px 28px',
                        opacity: 0.045,
                    }}
                />

                {/* Logo */}
                <Logo
                    className="h-[72px] w-[72px] mb-5 relative anim-fade-up"
                    style={{ color: 'var(--foreground)' }}
                />

                {/* Brand name */}
                <h1
                    className="font-sansation m-0 leading-none relative anim-fade-up-1"
                    style={{ fontSize: 'clamp(44px, 9vw, 88px)' }}
                >
                    <span style={{ fontWeight: 700 }}>MATTEDI</span>
                    <span style={{ fontWeight: 400, color: '#F5961C' }}>WORKS</span>
                </h1>

                {/* Eyebrow */}
                <p className="font-sansation text-base tracking-[0.25em] uppercase text-[var(--muted-foreground)] mt-3 mb-7 relative anim-fade-up-2">
                    web utilities
                </p>

                {/* Orange rule */}
                <div
                    aria-hidden
                    className="w-10 h-px mb-9 relative anim-fade-up-2"
                    style={{ backgroundColor: '#F5961C' }}
                />

                {/* Headline */}
                <p
                    className="font-lato leading-relaxed max-w-[540px] mb-4 relative anim-fade-up-3"
                    style={{
                        fontSize: 'clamp(17px, 2.8vw, 22px)',
                        color: 'var(--foreground)',
                    }}
                >
                    Sharp, focused web tools that work{' '}
                    <em style={{ color: '#F5961C', fontStyle: 'italic' }}>instantly</em>{' '}
                    in your browser.
                </p>

                {/* Subline */}
                <p className="font-lato text-sm text-[var(--muted-foreground)] leading-relaxed max-w-[390px] mb-12 relative anim-fade-up-4">
                    Free. No account. No uploads. Your data never leaves your device.
                </p>

                {/* CTA */}
                <button
                    onClick={() =>
                        document.getElementById('tools')?.scrollIntoView({ behavior: 'smooth' })
                    }
                    onMouseEnter={() => setCtaHovered(true)}
                    onMouseLeave={() => setCtaHovered(false)}
                    className="relative flex items-center gap-2.5 px-8 py-4 font-audiowide text-sm tracking-wider anim-fade-up-5"
                    style={{
                        backgroundColor: '#F5961C',
                        color: '#1B2F5E',
                        borderRadius: '10px',
                        boxShadow: ctaHovered
                            ? '0 8px 40px rgba(245,150,28,0.55)'
                            : '0 4px 28px rgba(245,150,28,0.38)',
                        transform: ctaHovered ? 'translateY(-3px)' : undefined,
                        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                    }}
                >
                    Explore tools
                    <ArrowRight size={16} />
                </button>
            </section>

            {/* ── Tools ────────────────────────────────────────── */}
            <section id="tools" className="px-6 pb-24">
                <div className="max-w-[960px] mx-auto">
                    <p className="font-sansation text-base tracking-[0.2em] uppercase text-[var(--muted-foreground)] text-center mb-10">
                        Available now
                    </p>

                    <div className={`grid gap-5 ${onMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {TOOLS.map(({ icon: Icon, title, route, badge, description, cta }) => {
                            const hovered = hoveredTool === route;
                            return (
                                <div
                                    key={route}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => navigate(route)}
                                    onKeyDown={e => e.key === 'Enter' && navigate(route)}
                                    onMouseEnter={() => setHoveredTool(route)}
                                    onMouseLeave={() => setHoveredTool(null)}
                                    className="relative flex flex-col p-8 border bg-[var(--card)] cursor-pointer outline-none"
                                    style={{
                                        borderColor: hovered ? '#F5961C' : 'var(--border)',
                                        borderRadius: '16px',
                                        transform: hovered ? 'translateY(-6px)' : undefined,
                                        boxShadow: hovered
                                            ? '0 16px 56px rgba(245,150,28,0.15), 0 0 0 1.5px #F5961C'
                                            : '0 2px 8px rgba(0,0,0,0.04)',
                                        transition:
                                            'border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
                                    }}
                                >
                                    {/* Format badge */}
                                    <span
                                        className="absolute top-5 right-5 font-jetbrains text-[9px] tracking-[0.22em] uppercase px-2.5 py-1 border"
                                        style={{
                                            color: '#F5961C',
                                            borderColor: hovered
                                                ? '#F5961C'
                                                : 'rgba(245,150,28,0.4)',
                                            backgroundColor: 'rgba(245,150,28,0.08)',
                                            borderRadius: '6px',
                                            transition: 'border-color 0.2s ease',
                                        }}
                                    >
                                        {badge}
                                    </span>

                                    {/* Icon box */}
                                    <div
                                        className="flex items-center justify-center w-12 h-12 mb-5"
                                        style={{
                                            backgroundColor: hovered
                                                ? 'rgba(245,150,28,0.2)'
                                                : 'rgba(245,150,28,0.1)',
                                            color: '#F5961C',
                                            borderRadius: '12px',
                                            transition: 'background-color 0.2s ease',
                                        }}
                                    >
                                        <Icon size={24} strokeWidth={1.75} />
                                    </div>

                                    <h2 className="font-audiowide text-xl leading-snug mb-3 text-[var(--foreground)]">
                                        {title}
                                    </h2>

                                    <p className="font-lato text-sm text-[var(--muted-foreground)] leading-relaxed flex-1 mb-7">
                                        {description}
                                    </p>

                                    {/* CTA link */}
                                    <div
                                        className="flex items-center gap-2 font-jetbrains text-xs tracking-[0.16em] uppercase"
                                        style={{
                                            color: '#F5961C',
                                            transform: hovered ? 'translateX(5px)' : undefined,
                                            transition: 'transform 0.2s ease',
                                        }}
                                    >
                                        {cta}
                                        <ArrowRight size={13} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── Pillars ─────────────────────────────────────── */}
            <section
                className="border-t border-[var(--border)] px-6 py-24"
                style={{ backgroundColor: 'var(--card)' }}
            >
                <div className="max-w-[960px] mx-auto">
                    <p className="font-sansation text-base tracking-[0.2em] uppercase text-[var(--muted-foreground)] text-center mb-16">
                        Why it works
                    </p>

                    <div className={`grid gap-14 ${onMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
                        {PILLARS.map(({ icon: Icon, label, desc }) => (
                            <div key={label} className="flex flex-col gap-5">
                                <div
                                    className="flex items-center justify-center w-16 h-16"
                                    style={{
                                        backgroundColor: 'rgba(245,150,28,0.12)',
                                        color: '#F5961C',
                                        borderRadius: '16px',
                                    }}
                                >
                                    <Icon size={30} strokeWidth={1.5} />
                                </div>
                                <h3 className="font-audiowide text-lg text-[var(--foreground)]">
                                    {label}
                                </h3>
                                <p className="font-lato text-base text-[var(--muted-foreground)] leading-relaxed">
                                    {desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Footer ──────────────────────────────────────── */}
            <footer className="border-t border-[var(--border)] px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                    <Logo className="h-5 w-5" style={{ color: 'var(--foreground)' }} />
                    <span className="font-sansation text-sm text-[var(--muted-foreground)] leading-none">
                        <span style={{ fontWeight: 700 }}>MATTEDI</span>
                        <span style={{ fontWeight: 400, color: '#F5961C' }}>WORKS</span>
                    </span>
                </div>

                <span className="font-jetbrains text-[10px] tracking-[0.22em] uppercase text-[var(--muted-foreground)]">
                    Free · Private · Open source
                </span>

                <div className="flex items-center gap-4 text-lg" style={{ color: 'var(--muted-foreground)' }}>
                    <a
                        href="https://github.com/vtmattedi"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors hover:text-[var(--foreground)]"
                        aria-label="GitHub"
                    >
                        <span className="bi bi-github" />
                    </a>
                    <a
                        href="https://www.linkedin.com/in/vitor-mattedi-dev/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors hover:text-[var(--foreground)]"
                        aria-label="LinkedIn"
                    >
                        <span className="bi bi-linkedin" />
                    </a>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
