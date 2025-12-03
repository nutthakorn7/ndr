import { useState, useEffect } from 'react';

interface ThreatPoint {
  id: string;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  country: string;
  count: number;
}

export default function WorldMap() {
  const [threats, setThreats] = useState<ThreatPoint[]>([]);

  // Generate mock threats
  useEffect(() => {
    const interval = setInterval(() => {
      const newThreat: ThreatPoint = {
        id: Math.random().toString(36).substr(2, 9),
        x: Math.random() * 80 + 10, // Keep away from edges
        y: Math.random() * 60 + 20,
        country: 'Unknown',
        count: Math.floor(Math.random() * 100)
      };
      
      setThreats(prev => [...prev.slice(-20), newThreat]);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full bg-[#0f172a] relative overflow-hidden rounded border border-[var(--border-subtle)] flex items-center justify-center">
      {/* Grid Background */}
      <div className="absolute inset-0" 
        style={{ 
          backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)', 
          backgroundSize: '20px 20px',
          opacity: 0.2
        }} 
      />

      {/* Abstract World Map (SVG) */}
      <svg viewBox="0 0 1000 600" className="w-full h-full opacity-50">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Render simplified continents */}
        {/* Using a very rough approximation for visual context */}
        <path d="M 50,50 L 300,50 L 250,250 L 50,150 Z" fill="#1e293b" stroke="#334155" strokeWidth="2" /> {/* NA */}
        <path d="M 200,270 L 320,270 L 280,500 L 220,450 Z" fill="#1e293b" stroke="#334155" strokeWidth="2" /> {/* SA */}
        <path d="M 400,50 L 550,50 L 520,180 L 420,180 Z" fill="#1e293b" stroke="#334155" strokeWidth="2" /> {/* EU */}
        <path d="M 420,200 L 560,200 L 530,450 L 400,350 Z" fill="#1e293b" stroke="#334155" strokeWidth="2" /> {/* AF */}
        <path d="M 570,50 L 900,50 L 850,300 L 570,250 Z" fill="#1e293b" stroke="#334155" strokeWidth="2" /> {/* AS */}
        <path d="M 700,350 L 850,350 L 820,500 L 700,450 Z" fill="#1e293b" stroke="#334155" strokeWidth="2" /> {/* AU */}

        {/* Connection Lines */}
        {threats.map((t, i) => (
           i > 0 && (
            <line 
              key={`line-${t.id}`}
              x1={`${threats[i-1].x}%`} 
              y1={`${threats[i-1].y}%`} 
              x2={`${t.x}%`} 
              y2={`${t.y}%`} 
              stroke="rgba(59, 130, 246, 0.2)" 
              strokeWidth="1"
            />
           )
        ))}

        {/* Threat Points */}
        {threats.map(t => (
          <g key={t.id}>
            <circle 
              cx={`${t.x}%`} 
              cy={`${t.y}%`} 
              r="4" 
              fill="#ef4444" 
              filter="url(#glow)"
            >
              <animate 
                attributeName="r" 
                values="4;8;4" 
                dur="2s" 
                repeatCount="indefinite" 
              />
              <animate 
                attributeName="opacity" 
                values="1;0.5;1" 
                dur="2s" 
                repeatCount="indefinite" 
              />
            </circle>
            <circle 
              cx={`${t.x}%`} 
              cy={`${t.y}%`} 
              r="15" 
              fill="none" 
              stroke="#ef4444" 
              strokeWidth="1"
              opacity="0.5"
            >
               <animate 
                attributeName="r" 
                values="4;20" 
                dur="1.5s" 
                repeatCount="indefinite" 
              />
              <animate 
                attributeName="opacity" 
                values="0.8;0" 
                dur="1.5s" 
                repeatCount="indefinite" 
              />
            </circle>
          </g>
        ))}
      </svg>

      {/* Overlay Stats */}
      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur p-4 rounded border border-[var(--border-subtle)]">
        <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">Active Threats</h3>
        <div className="text-2xl font-mono text-[var(--sev-critical)]">{threats.length}</div>
        <div className="text-xs text-[var(--text-secondary)] mt-1">Origins Detected</div>
      </div>
      
      <div className="absolute bottom-4 left-4 text-xs text-[var(--text-secondary)]">
        LIVE THREAT MAP // GLOBAL SENSORS
      </div>
    </div>
  );
}
