import React, { useState, useEffect, useRef, useCallback } from 'react';


import homeImage from './home.gif';

import './App.css';

// ==================================================================
// Constants
// ==================================================================
const FPS = 30;
const VIDEO_W = 854;
const VIDEO_H = 480;
const PREVIEW_W = 640;
const PREVIEW_H = 360;

const MAX_OUTPUT_SECONDS = 0;
const CHUNK_SECONDS = 10;
const STAR_COUNT = 70;

// ==================================================================
// Helpers
// ==================================================================
function formatSeconds(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
}

function formatDateTimeDMY(input) {
    if (!input) return '-';
    const d = new Date(input);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hh}:${mm}:${ss}`;
}

function drawVideoContain(ctx, videoEl, canvasW, canvasH) {
    if (!videoEl) return;
    const vw = videoEl.videoWidth;
    const vh = videoEl.videoHeight;
    if (!vw || !vh) return;

    const videoRatio = vw / vh;
    const canvasRatio = canvasW / canvasH;

    let drawW, drawH, dx, dy;
    if (videoRatio > canvasRatio) {
        drawW = canvasW;
        drawH = canvasW / videoRatio;
        dx = 0;
        dy = (canvasH - drawH) / 2;
    } else {
        drawH = canvasH;
        drawW = canvasH * videoRatio;
        dx = (canvasW - drawW) / 2;
        dy = 0;
    }
    ctx.drawImage(videoEl, dx, dy, drawW, drawH);
}

function createStars(canvasW, canvasH) {
    const stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            nx: Math.random(),
            ny: Math.random(),
            r: 1.5 + Math.random() * 3.5,
            phase: Math.random() * Math.PI * 2,
            twinkleSpeed: 1.5 + Math.random() * 3.5,
            driftAmpX: 4 + Math.random() * 12,
            driftAmpY: 4 + Math.random() * 12,
            driftSpeedX: 0.15 + Math.random() * 0.35,
            driftSpeedY: 0.15 + Math.random() * 0.35,
            baseAlpha: 0.55 + Math.random() * 0.45,
            points: Math.random() < 0.5 ? 4 : 5,
        });
    }
    return stars;
}

function drawStars(ctx, stars, t, bass, width, height) {
    for (const s of stars) {
        const px = s.nx * width + Math.sin(t * s.driftSpeedX + s.phase) * s.driftAmpX;
        const py = s.ny * height + Math.cos(t * s.driftSpeedY + s.phase * 1.3) * s.driftAmpY;

        const twinkle = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.phase);
        const alpha = s.baseAlpha * (0.35 + 0.65 * twinkle);

        const sizeBoost = bass * 6;
        const outerR = s.r + sizeBoost;

        ctx.save();
        ctx.shadowColor = `rgba(255, 230, 40, ${alpha * 0.9})`;
        ctx.shadowBlur = 10 + bass * 22;

        const points = s.points;
        const innerR = outerR * 0.42;
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const rad = (i * Math.PI) / points - Math.PI / 2;
            const rr = i % 2 === 0 ? outerR : innerR;
            const sx = px + Math.cos(rad) * rr;
            const sy = py + Math.sin(rad) * rr;
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        }
        ctx.closePath();

        const grad = ctx.createRadialGradient(px, py, 0, px, py, outerR);
        grad.addColorStop(0, `rgba(255, 255, 200, ${alpha})`);
        grad.addColorStop(0.45, `rgba(255, 225, 40, ${alpha})`);
        grad.addColorStop(1, `rgba(255, 175, 0, ${alpha * 0.55})`);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.6, outerR * 0.25), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 240, ${alpha})`;
        ctx.fill();

        ctx.restore();
    }
}

function drawMusicVideoFrame(ctx, canvas, t, opts) {
    const {
        analyser, freqData, title, subtitle,
        duration, particles, videoEl, stars,
    } = opts;

    const { width, height } = canvas;
    const cx = width / 2;
    const cy = height / 2;

    let bass = 0, mid = 0, treble = 0;
    if (analyser && freqData) {
        analyser.getByteFrequencyData(freqData);
        const N = freqData.length;
        const bassEnd = Math.floor(N * 0.08);
        const midEnd = Math.floor(N * 0.35);
        let s1 = 0, s2 = 0, s3 = 0;
        for (let i = 0; i < bassEnd; i++) s1 += freqData[i];
        for (let i = bassEnd; i < midEnd; i++) s2 += freqData[i];
        for (let i = midEnd; i < N; i++) s3 += freqData[i];
        bass = s1 / Math.max(1, bassEnd) / 255;
        mid = s2 / Math.max(1, midEnd - bassEnd) / 255;
        treble = s3 / Math.max(1, N - midEnd) / 255;
    }

    const hueShift = (t * 55) % 360;

    ctx.fillStyle = `hsl(${(hueShift + 260) % 360}, 45%, 5%)`;
    ctx.fillRect(0, 0, width, height);

    const videoReady =
        videoEl &&
        videoEl.readyState >= 2 &&
        videoEl.videoWidth > 0 &&
        videoEl.videoHeight > 0;

    if (videoReady) {
        const zoom = 1.0 + bass * 0.025 + treble * 0.01;
        const shakeX = (Math.sin(t * 3.1) + (Math.random() - 0.5)) * bass * 3;
        const shakeY = (Math.cos(t * 2.7) + (Math.random() - 0.5)) * bass * 3;
        const angle = Math.sin(t * 0.9) * 0.008 + (Math.random() - 0.5) * bass * 0.012;

        ctx.save();
        ctx.translate(cx + shakeX, cy + shakeY);
        ctx.rotate(angle);
        ctx.scale(zoom, zoom);
        ctx.translate(-cx, -cy);

        drawVideoContain(ctx, videoEl, width, height);

        ctx.restore();

        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        const washAlpha = 0.22 + bass * 0.18;
        const washHue = (hueShift + 40) % 360;
        ctx.fillStyle = `hsla(${washHue}, 90%, 55%, ${washAlpha})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();

        if (bass > 0.08) {
            ctx.save();
            ctx.globalCompositeOperation = 'saturation';
            ctx.fillStyle = `hsla(${(hueShift + 180) % 360}, 100%, 50%, ${0.18 + bass * 0.35})`;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }

        if (treble > 0.05) {
            ctx.save();
            ctx.globalCompositeOperation = 'soft-light';
            ctx.fillStyle = `hsla(${(50 + hueShift) % 360}, 100%, 60%, ${treble * 0.45})`;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }

        if (bass > 0.05) {
            const glow = ctx.createRadialGradient(
                cx, cy, 0,
                cx, cy, Math.max(width, height) * (0.55 + bass * 0.35)
            );
            glow.addColorStop(0, `hsla(${(150 + hueShift) % 360}, 95%, 60%, ${bass * 0.4})`);
            glow.addColorStop(0.6, `hsla(${(280 + hueShift) % 360}, 95%, 55%, ${bass * 0.18})`);
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }

        const rimHue = (hueShift * 1.4) % 360;
        const rim = ctx.createRadialGradient(
            cx, cy, Math.min(width, height) * 0.32,
            cx, cy, Math.max(width, height) * 0.78
        );
        rim.addColorStop(0, 'rgba(0,0,0,0)');
        rim.addColorStop(0.65, `hsla(${rimHue}, 90%, 55%, ${0.12 + bass * 0.22})`);
        rim.addColorStop(1, `hsla(${(rimHue + 120) % 360}, 90%, 45%, ${0.35 + bass * 0.35})`);
        ctx.fillStyle = rim;
        ctx.fillRect(0, 0, width, height);
    } else {
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, `hsl(${(200 + hueShift) % 360}, 65%, 8%)`);
        grad.addColorStop(0.5, `hsl(${(280 + hueShift) % 360}, 70%, 6%)`);
        grad.addColorStop(1, `hsl(${(160 + hueShift) % 360}, 65%, 4%)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    if (bass > 0.6) {
        ctx.fillStyle = `hsla(${(60 + hueShift) % 360}, 100%, 60%, ${(bass - 0.6) * 0.35})`;
        ctx.fillRect(0, 0, width, height);
    }

    if (stars && stars.length) {
        drawStars(ctx, stars, t, bass, width, height);
    }

    if (particles) {
        for (const p of particles) {
            const life = 1 - p.age / p.life;
            if (life <= 0) continue;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * life, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 95%, 65%, ${life * 0.9})`;
            ctx.fill();
        }
    }

    const titleFont = Math.floor(width / 18);
    ctx.font = `bold ${titleFont}px Segoe UI, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = `hsl(${(hueShift + 60) % 360}, 100%, 55%)`;
    ctx.shadowBlur = 24 + bass * 30;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title || 'Untitled', cx, height * 0.82, width * 0.9);

    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = `hsla(${(hueShift + 140) % 360}, 100%, 60%, ${0.35 + bass * 0.5})`;
    ctx.strokeText(title || 'Untitled', cx, height * 0.82, width * 0.9);

    const subFont = Math.floor(width / 46);
    ctx.font = `${subFont}px Segoe UI, sans-serif`;
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(245,240,210,0.9)';
    ctx.fillText(subtitle || '', cx, height * 0.90, width * 0.9);
    ctx.shadowBlur = 0;

    const pct = duration > 0 ? Math.min(1, t / duration) : 0;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, 0, width, 6);
    const barGrad = ctx.createLinearGradient(0, 0, width * Math.max(pct, 0.001), 0);
    barGrad.addColorStop(0, `hsl(${(50 + hueShift) % 360}, 100%, 60%)`);
    barGrad.addColorStop(1, `hsl(${(160 + hueShift) % 360}, 95%, 60%)`);
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, 0, width * pct, 6);

    ctx.font = `${Math.floor(width / 60)}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(`${formatSeconds(t)} / ${formatSeconds(duration)}`, 20, 20);
    ctx.shadowBlur = 0;
}

// ==================================================================
// Main component
// ==================================================================
export default function MusicVideoMaker() {
    const [wavFileName, setWavFileName] = useState('');
    const [audioUrl, setAudioUrl] = useState(null);
    const [audioBuffer, setAudioBuffer] = useState(null);
    const [fullDuration, setFullDuration] = useState(0);

    const [videoFile, setVideoFile] = useState(null);
    const [videoFileName, setVideoFileName] = useState('');
    const [videoUrl, setVideoUrl] = useState(null);
    const [videoReady, setVideoReady] = useState(false);
    const [videoError, setVideoError] = useState(null);

    const [title, setTitle] = useState('My Music Video');
    const [subtitle, setSubtitle] = useState('Created with NormSki Video Maker');

    const [isPreparing, setIsPreparing] = useState(false);
    const [isRendering, setIsRendering] = useState(false);
    const [isTranscoding, setIsTranscoding] = useState(false);
    const [progress, setProgress] = useState(0);
    const [encodeProgress, setEncodeProgress] = useState(0);
    const [chunkInfo, setChunkInfo] = useState('');
    const [outputUrl, setOutputUrl] = useState(null);
    const [outputExt, setOutputExt] = useState('mp4');
    const [error, setError] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [eta, setEta] = useState('');

    const canvasRef = useRef(null);
    const previewCanvasRef = useRef(null);
    const videoElRef = useRef(null);
    const audioCtxRef = useRef(null);
    const analyserRef = useRef(null);
    const streamDestRef = useRef(null);
    const sourceNodeRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const rafRef = useRef(null);
    const cancelFlagRef = useRef(false);
    const particlesRef = useRef([]);
    const starsRef = useRef(createStars(VIDEO_W, VIDEO_H));
    const buffersRef = useRef({ freq: null });
    const ffmpegRef = useRef(null);
    const timerRef = useRef(null);
    const encodeStartRef = useRef(0);
    const audioStartTimeRef = useRef(0);
    const finishTimeoutRef = useRef(null);
    const videoStallCheckRef = useRef(0);

    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
            if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
            if (sourceNodeRef.current) {
                try { sourceNodeRef.current.stop(); } catch (e) { }
            }
            if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
                audioCtxRef.current.close().catch(() => { });
            }
        };
    }, []);



    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h1 style={styles.title}>Automate your business workflows</h1>
            </header>

            <div style={styles.layout}>
                {/* Sidebar with links */}
                <aside style={styles.sidebar}>
                    <h2 style={styles.sidebarTitle}>Links</h2>
                    <ul style={styles.linkList}>
                        <li style={styles.linkItem}>
                            <a
                                href="https://splendorous-cupcake-ea4c80.netlify.app/"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={styles.link}
                            >
                                Estate Agents
                            </a>
                        </li>
                        <li style={styles.linkItem}>
                            <a
                                href="https://totalrecall.network/"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={styles.link}
                            >
                                TotalRecall
                            </a>
                        </li>
                    </ul>
                </aside>

                {/* Main content */}
                <main style={styles.mainBody}>
                    <div style={styles.contentWrapper}>
                        <img
                            src={homeImage}
                            alt="Home"
                            style={styles.homeImage}
                        />
                        <p style={styles.descriptionText}>
                            Our LLM can help automate your business, make you more efficient and help you make more money
                        </p>
                    </div>
                </main>
            </div>

            {/* Hidden canvases & video element required by the render pipeline */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <canvas ref={previewCanvasRef} style={{ display: 'none' }} />
            <video
                ref={videoElRef}
                muted
                playsInline
                loop
                preload="auto"
                style={{ display: 'none' }}
            />
        </div>
    );
}

// ==================================================================
// Styles
// ==================================================================
const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#0b141a',
        color: '#e9edef',
        fontFamily: 'Segoe UI, sans-serif',
    },
    header: {
        padding: '24px 20px',
        backgroundColor: '#202c33',
        borderBottom: '1px solid #222d34',
        textAlign: 'center',
    },
    title: { margin: 0, color: '#00a884', fontSize: '28px' },

    // New two-column layout
    layout: {
        flex: 1,
        display: 'flex',
        alignItems: 'flex-start',
        minHeight: 0,
    },

    // Left sidebar
    sidebar: {
        width: '220px',
        flexShrink: 0,
        padding: '24px 16px',
        backgroundColor: '#111b21',
        borderRight: '1px solid #222d34',
        minHeight: '100%',
    },
    sidebarTitle: {
        margin: '0 0 16px 0',
        fontSize: '14px',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#8696a0',
        fontWeight: '600',
    },
    linkList: {
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    linkItem: {
        margin: 0,
        padding: 0,
    },
    link: {
        display: 'block',
        padding: '10px 12px',
        borderRadius: '8px',
        color: '#e9edef',
        textDecoration: 'none',
        fontSize: '15px',
        fontWeight: '500',
        backgroundColor: '#202c33',
        border: '1px solid transparent',
        transition: 'background-color 0.15s ease, border-color 0.15s ease',
    },

    // Main body (now sits right of sidebar)
    mainBody: {
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '40px 20px',
        minWidth: 0,
    },
    contentWrapper: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: '800px',
        width: '100%',
    },
    homeImage: {
        display: 'block',
        maxWidth: '100%',
        width: '800px',
        height: 'auto',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    },
    descriptionText: {
        marginTop: '24px',
        fontSize: '18px',
        lineHeight: '1.6',
        color: '#e9edef',
        textAlign: 'center',
        fontWeight: '500',
    },
};