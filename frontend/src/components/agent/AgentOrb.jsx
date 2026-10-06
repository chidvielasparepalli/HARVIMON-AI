export default function AgentOrb({ listening = false }) {
  return (
    <div className={`agent-orb ${listening ? "listening" : ""}`} aria-label={listening ? "AI is listening" : "AI Agent Orb"}>
      {/* Ambient aura and backdrop glows */}
      <div className="orb-ambient-glow" />
      <div className="orb-backdrop-pulse" />

      {/* Orbiting concentric rings */}
      <div className="orb-orbit orb-orbit-outer">
        <span className="orb-satellite satellite-1" />
      </div>
      <div className="orb-orbit orb-orbit-middle">
        <span className="orb-satellite satellite-2" />
      </div>
      <div className="orb-orbit orb-orbit-inner" />

      {/* Floating energy particles */}
      <div className="orb-particles">
        <span className="particle p1" />
        <span className="particle p2" />
        <span className="particle p3" />
        <span className="particle p4" />
      </div>

      {/* Animated SVG Flux Ring / Waves */}
      <svg
        viewBox="0 0 160 160"
        className="agent-orb-svg"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="orbGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="orbGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.4" />
          </linearGradient>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="35%" stopColor="#93c5fd" stopOpacity="0.75" />
            <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="80" cy="80" r="74" stroke="url(#orbGradient2)" strokeWidth="1.2" strokeDasharray="6 4" className="svg-ring-dashed" />
        <circle cx="80" cy="80" r="62" stroke="url(#orbGradient1)" strokeWidth="1.8" className="svg-ring-wave-1" />
        <ellipse cx="80" cy="80" rx="55" ry="32" stroke="#60a5fa" strokeWidth="1.2" strokeOpacity="0.65" className="svg-ring-tilt-1" />
        <ellipse cx="80" cy="80" rx="32" ry="55" stroke="#c084fc" strokeWidth="1.2" strokeOpacity="0.5" className="svg-ring-tilt-2" />
        
        {/* Organic curved energy filaments */}
        <path
          d="M 80 18 C 112 50, 48 110, 80 142"
          stroke="url(#orbGradient1)"
          strokeWidth="2.2"
          strokeLinecap="round"
          className="svg-wave-strand strand-a"
        />
        <path
          d="M 18 80 C 50 112, 110 48, 142 80"
          stroke="url(#orbGradient2)"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="svg-wave-strand strand-b"
        />
        <circle cx="80" cy="80" r="42" fill="url(#coreGlow)" className="svg-core-glow" />
      </svg>

      {/* Center glowing core */}
      <div className="orb-core">
        <div className="orb-core-inner">
          <div className="orb-core-sparkle" />
        </div>
      </div>

      {/* Listening indicator audio ripples */}
      {listening && (
        <div className="orb-listening-ripples">
          <span className="ripple r1" />
          <span className="ripple r2" />
          <span className="ripple r3" />
        </div>
      )}
    </div>
  );
}
