"use client";

// Layered animated backdrop — sits behind everything, pointer-events disabled.
// Purple/pink aurora blobs drift, a faint grid subtly parallax-scrolls, and
// currency-shaped particles float upward. GPU-friendly (transform + opacity).

export function LiveBackdrop() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
    >
      {/* Aurora blobs */}
      <div className="kredo-blob kredo-blob-a" />
      <div className="kredo-blob kredo-blob-b" />
      <div className="kredo-blob kredo-blob-c" />

      {/* Grid overlay */}
      <div className="kredo-grid" />

      {/* Scanning conic beam */}
      <div className="kredo-beam" />

      {/* Floating $ / % symbols */}
      <div className="kredo-particles">
        {["$", "◆", "%", "◇", "$", "•", "◆", "%", "◇", "•"].map((c, i) => (
          <span key={i} className={`kredo-particle kredo-p${i}`}>{c}</span>
        ))}
      </div>

      <style jsx>{`
        .kredo-blob {
          position: absolute;
          border-radius: 9999px;
          filter: blur(80px);
          opacity: 0.55;
          mix-blend-mode: screen;
          will-change: transform;
        }
        .kredo-blob-a {
          width: 620px; height: 620px;
          top: -180px; left: -160px;
          background: radial-gradient(circle at 30% 30%, #9B6AF6, transparent 70%);
          animation: kredoDriftA 22s ease-in-out infinite;
        }
        .kredo-blob-b {
          width: 720px; height: 720px;
          top: 20%; right: -220px;
          background: radial-gradient(circle at 60% 40%, #E37DF7, transparent 70%);
          animation: kredoDriftB 26s ease-in-out infinite;
        }
        .kredo-blob-c {
          width: 560px; height: 560px;
          bottom: -180px; left: 30%;
          background: radial-gradient(circle at 50% 50%, #5A6BFF, transparent 70%);
          animation: kredoDriftC 30s ease-in-out infinite;
        }
        @keyframes kredoDriftA {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(120px, 80px) scale(1.15); }
        }
        @keyframes kredoDriftB {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(-140px, 100px) scale(1.1); }
        }
        @keyframes kredoDriftC {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(80px, -120px) scale(1.2); }
        }

        .kredo-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(to right,  rgba(155, 106, 246, 0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(155, 106, 246, 0.06) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 90%);
          -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 90%);
          animation: kredoGridPan 40s linear infinite;
        }
        @keyframes kredoGridPan {
          from { background-position: 0 0;       }
          to   { background-position: 56px 56px; }
        }

        .kredo-beam {
          position: absolute;
          top: -30%; left: 50%;
          width: 160%; height: 160%;
          transform: translateX(-50%);
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            rgba(227, 125, 247, 0.05) 40deg,
            transparent 90deg,
            transparent 270deg,
            rgba(155, 106, 246, 0.05) 320deg,
            transparent 360deg
          );
          animation: kredoBeamSpin 40s linear infinite;
          mix-blend-mode: screen;
        }
        @keyframes kredoBeamSpin {
          from { transform: translateX(-50%) rotate(0deg);   }
          to   { transform: translateX(-50%) rotate(360deg); }
        }

        .kredo-particles {
          position: absolute; inset: 0;
        }
        .kredo-particle {
          position: absolute;
          bottom: -40px;
          font-family: ui-monospace, monospace;
          font-size: 14px;
          color: rgba(227, 125, 247, 0.35);
          text-shadow: 0 0 8px rgba(155, 106, 246, 0.6);
          animation: kredoFloat linear infinite;
        }
        @keyframes kredoFloat {
          0%   { transform: translateY(0)        translateX(0);   opacity: 0; }
          10%  { opacity: 0.7; }
          90%  { opacity: 0.7; }
          100% { transform: translateY(-110vh)   translateX(40px); opacity: 0; }
        }
        .kredo-p0 { left:  5%; animation-duration: 18s; animation-delay:  0s;  font-size: 12px; }
        .kredo-p1 { left: 14%; animation-duration: 22s; animation-delay:  3s;  font-size: 16px; color: rgba(155,106,246,0.4); }
        .kredo-p2 { left: 24%; animation-duration: 26s; animation-delay:  6s;  font-size: 11px; }
        .kredo-p3 { left: 34%; animation-duration: 20s; animation-delay:  1s;  font-size: 14px; }
        .kredo-p4 { left: 44%; animation-duration: 24s; animation-delay:  5s;  font-size: 18px; color: rgba(155,106,246,0.5); }
        .kredo-p5 { left: 55%; animation-duration: 28s; animation-delay:  2s;  font-size: 10px; }
        .kredo-p6 { left: 65%; animation-duration: 21s; animation-delay:  7s;  font-size: 15px; }
        .kredo-p7 { left: 75%; animation-duration: 25s; animation-delay:  4s;  font-size: 12px; color: rgba(155,106,246,0.35); }
        .kredo-p8 { left: 85%; animation-duration: 19s; animation-delay:  8s;  font-size: 13px; }
        .kredo-p9 { left: 92%; animation-duration: 27s; animation-delay: 10s;  font-size: 16px; }

        @media (prefers-reduced-motion: reduce) {
          .kredo-blob, .kredo-grid, .kredo-beam, .kredo-particle {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
