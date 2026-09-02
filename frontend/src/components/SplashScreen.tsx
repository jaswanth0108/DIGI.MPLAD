import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [phase, setPhase] = useState<'enter' | 'active' | 'exit' | 'done'>('enter');

  useEffect(() => {
    // Phase 1: Enter -> Active (scale and glow in)
    const t1 = setTimeout(() => {
      setPhase('active');
    }, 100);

    // Phase 2: Start fade up exit after 2.0s
    const t2 = setTimeout(() => {
      setPhase('exit');
    }, 2000);

    // Phase 3: Completely remove splash after transition finishes
    const t3 = setTimeout(() => {
      setPhase('done');
      if (onFinish) onFinish();
    }, 2600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onFinish]);

  if (phase === 'done') {
    return null;
  }

  const isExiting = phase === 'exit';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'radial-gradient(circle at 50% 40%, #0f172a 0%, #060913 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? 'scale(1.04)' : 'scale(1)',
        transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: isExiting ? 'none' : 'auto',
      }}
      onClick={() => {
        setPhase('exit');
        setTimeout(() => {
          setPhase('done');
          if (onFinish) onFinish();
        }, 300);
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          transform: isExiting ? 'translateY(-60px)' : 'translateY(0)',
          transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Animated Central Logo (Medium Size) */}
        <div
          style={{
            width: 170,
            height: 170,
            borderRadius: '50%',
            overflow: 'hidden',
            boxShadow: '0 0 50px rgba(56, 189, 248, 0.35), 0 0 100px rgba(20, 184, 166, 0.2)',
            border: '2px solid rgba(56, 189, 248, 0.5)',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            animation: 'splash-logo-pulse 2.2s ease-in-out infinite',
          }}
        >
          <img
            src="/logo.png"
            alt="Digi.MPLAD Logo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        </div>

        {/* Brand Name */}
        <h1
          style={{
            fontSize: '2.2rem',
            fontWeight: 900,
            letterSpacing: '-0.03em',
            margin: '0 0 0.4rem',
            background: 'linear-gradient(135deg, #38bdf8 0%, #14b8a6 50%, #818cf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Digi.MPLAD
        </h1>

        {/* Tagline / Subtitle */}
        <div
          style={{
            fontSize: '0.85rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: '#94a3b8',
            textTransform: 'uppercase',
            marginBottom: '1.5rem',
          }}
        >
          AI Risk Intelligence &amp; Audit Surveillance
        </div>

        {/* Progress Bar & Status */}
        <div style={{ width: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: '100%',
              height: 4,
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 99,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: '100%',
                background: 'linear-gradient(90deg, #38bdf8, #14b8a6)',
                borderRadius: 99,
                animation: 'splash-bar 2s ease-in-out forwards',
              }}
            />
          </div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(148, 163, 184, 0.7)', letterSpacing: '0.04em' }}>
            Initializing National Audit Surveillance...
          </div>
        </div>
      </div>
    </div>
  );
};
