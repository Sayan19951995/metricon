'use client';

import { useEffect, useRef } from 'react';

export default function BrandLoader({ text = 'Загрузка...' }: { text?: string }) {
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    // Inject keyframes once
    if (typeof document !== 'undefined' && !document.getElementById('brand-loader-styles')) {
      const style = document.createElement('style');
      style.id = 'brand-loader-styles';
      style.textContent = `
        @keyframes bl-orbit {
          0% { transform: rotate(0deg) translateY(-36px) rotate(0deg); opacity: 1; }
          50% { opacity: 0.3; }
          100% { transform: rotate(360deg) translateY(-36px) rotate(-360deg); opacity: 1; }
        }
        @keyframes bl-draw {
          0%, 100% { stroke-dashoffset: 80; opacity: 0.6; }
          50% { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes bl-glow {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.3); opacity: 0.05; }
        }
        @keyframes bl-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `;
      document.head.appendChild(style);
      styleRef.current = style;
    }
    return () => {
      if (styleRef.current) {
        styleRef.current.remove();
        styleRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
      <div
        className="flex flex-col items-center gap-5"
        style={{ animation: 'bl-float 3s ease-in-out infinite' }}
      >
        {/* Animated M logo */}
        <div className="relative" style={{ width: '72px', height: '72px' }}>
          {/* Glow ring */}
          <div
            className="absolute inset-0 bg-emerald-400/15 rounded-2xl"
            style={{ animation: 'bl-glow 2s ease-in-out infinite' }}
          />

          {/* Main container */}
          <div className="relative w-full h-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/20">
            {/* M as chart line */}
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
              <path
                d="M5 24V12L11 19L16 13L21 19L27 12V24"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 80,
                  animation: 'bl-draw 2.5s ease-in-out infinite',
                }}
              />
            </svg>
          </div>

          {/* Orbiting dot */}
          <div
            className="absolute w-2 h-2 bg-emerald-400 rounded-full"
            style={{
              animation: 'bl-orbit 2s linear infinite',
              top: 'calc(50% - 4px)',
              left: 'calc(50% - 4px)',
              boxShadow: '0 0 6px rgba(52, 211, 153, 0.6)',
            }}
          />
        </div>

        {/* Text */}
        {text && (
          <span className="text-sm text-gray-400 font-medium tracking-wide">{text}</span>
        )}
      </div>
    </div>
  );
}
