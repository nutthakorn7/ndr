import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { ThreatEvent } from '../schemas';

interface ThreatPoint {
  id: string;
  x: number;
  y: number;
  country: string;
  count: number;
  severity: string;
}

// Simple IP to approximate region mapping
const ipToRegion = (ip: string): { x: number; y: number; country: string } => {
  const octets = ip.split('.').map(n => parseInt(n));
  const firstOctet = octets[0];
  
  // Rough geographic mapping based on IP ranges
  if (firstOctet >= 1 && firstOctet <= 63) {
    return { x: 15 + Math.random() * 15, y: 30 + Math.random() * 15, country: 'North America' };
  } else if (firstOctet >= 64 && firstOctet <= 95) {
    return { x: 40 + Math.random() * 10, y: 20 + Math.random() * 15, country: 'Europe' };
  } else if (firstOctet >= 96 && firstOctet <= 127) {
    return { x: 42 + Math.random() * 10, y: 40 + Math.random() * 15, country: 'Africa' };
  } else if (firstOctet >= 128 && firstOctet <= 191) {
    return { x: 60 + Math.random() * 20, y: 25 + Math.random() * 20, country: 'Asia' };
  } else if (firstOctet >= 192 && firstOctet <= 223) {
    return { x: 70 + Math.random() * 10, y: 50 + Math.random() * 10, country: 'Australia' };
  } else {
    return { x: 25 + Math.random() * 10, y: 45 + Math.random() * 10, country: 'South America' };
  }
};

export default function WorldMap() {
  const [threats, setThreats] = useState<ThreatPoint[]>([]);
  const [regionCounts, setRegionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Fetch real threat data from API
  useEffect(() => {
    const fetchThreats = async () => {
      try {
        const response = await api.searchEvents({ 
          limit: 50,
          severity: 'critical,high',
          time_range: '1h'
        });
        
        // Map events to threat points
        const threatPoints: ThreatPoint[] = response.events.map((event: ThreatEvent) => {
          const sourceIp = event.source;
          const region = ipToRegion(sourceIp);
          
          return {
            id: event.id.toString(),
            ...region,
            severity: event.severity.toLowerCase(),
            count: 1
          };
        });
        
        // Count threats by region
        const counts: Record<string, number> = {};
        threatPoints.forEach(t => {
          counts[t.country] = (counts[t.country] || 0) + 1;
        });
        
        setThreats(threatPoints.slice(0, 20)); // Limit to 20 for performance
        setRegionCounts(counts);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch threat data:', error);
        setLoading(false);
      }
    };

    fetchThreats();
    const interval = setInterval(fetchThreats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      default: return '#3b82f6';
    }
  };

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

      {/* World Map SVG */}
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
        
        {/* Continents with labels */}
        <g id="north-america">
          <path d="M 50,50 L 300,50 L 250,250 L 50,150 Z" fill="#1e293b" stroke="#334155" strokeWidth="2" />
          <text x="150" y="140" fill="#64748b" fontSize="14" textAnchor="middle" fontWeight="bold">
            NORTH AMERICA
          </text>
          {regionCounts['North America'] && (
            <text x="150" y="160" fill="#ef4444" fontSize="12" textAnchor="middle">
              {regionCounts['North America']} threats
            </text>
          )}
        </g>
        
        <g id="south-america">
          <path d="M 200,270 L 320,270 L 280,500 L 220,450 Z" fill="#1e293b" stroke="#334155" strokeWidth="2" />
          <text x="260" y="380" fill="#64748b" fontSize="14" textAnchor="middle" fontWeight="bold">
            S. AMERICA
          </text>
          {regionCounts['South America'] && (
            <text x="260" y="400" fill="#ef4444" fontSize="12" textAnchor="middle">
              {regionCounts['South America']}
            </text>
          )}
        </g>
        
        <g id="europe">
          <path d="M 400,50 L 550,50 L 520,180 L 420,180 Z" fill="#1e293b" stroke="#334155" strokeWidth="2" />
          <text x="475" y="110" fill="#64748b" fontSize="14" textAnchor="middle" fontWeight="bold">
            EUROPE
          </text>
          {regionCounts['Europe'] && (
            <text x="475" y="130" fill="#ef4444" fontSize="12" textAnchor="middle">
              {regionCounts['Europe']}
            </text>
          )}
        </g>
        
        <g id="africa">
          <path d="M 420,200 L 560,200 L 530,450 L 400,350 Z" fill="#1e293b" stroke="#334155" strokeWidth="2" />
          <text x="475" y="320" fill="#64748b" fontSize="14" textAnchor="middle" fontWeight="bold">
            AFRICA
          </text>
          {regionCounts['Africa'] && (
            <text x="475" y="340" fill="#ef4444" fontSize="12" textAnchor="middle">
              {regionCounts['Africa']}
            </text>
          )}
        </g>
        
        <g id="asia">
          <path d="M 570,50 L 900,50 L 850,300 L 570,250 Z" fill="#1e293b" stroke="#334155" strokeWidth="2" />
          <text x="715" y="160" fill="#64748b" fontSize="14" textAnchor="middle" fontWeight="bold">
            ASIA
          </text>
          {regionCounts['Asia'] && (
            <text x="715" y="180" fill="#ef4444" fontSize="12" textAnchor="middle">
              {regionCounts['Asia']}
            </text>
          )}
        </g>
        
        <g id="australia">
          <path d="M 700,350 L 850,350 L 820,500 L 700,450 Z" fill="#1e293b" stroke="#334155" strokeWidth="2" />
          <text x="770" y="430" fill="#64748b" fontSize="14" textAnchor="middle" fontWeight="bold">
            AUSTRALIA
          </text>
          {regionCounts['Australia'] && (
            <text x="770" y="450" fill="#ef4444" fontSize="12" textAnchor="middle">
              {regionCounts['Australia']}
            </text>
          )}
        </g>

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
              fill={getSeverityColor(t.severity)}
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
              stroke={getSeverityColor(t.severity)}
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

      {/* Stats Overlay */}
      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur p-4 rounded border border-[var(--border-subtle)]">
        <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">Active Threats</h3>
        <div className="text-2xl font-mono text-[var(--sev-critical)]">{threats.length}</div>
        <div className="text-xs text-[var(--text-secondary)] mt-1">
          {loading ? 'Loading...' : 'Last Hour'}
        </div>
      </div>
      
      <div className="absolute bottom-4 left-4 text-xs text-[var(--text-secondary)]">
        LIVE THREAT MAP // GLOBAL SENSORS
      </div>
    </div>
  );
}
