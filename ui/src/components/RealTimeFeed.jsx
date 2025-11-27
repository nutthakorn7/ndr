/**
 * Real-Time Event Feed
 * Live streaming of security events
 */
import { useState, useEffect, useRef } from 'react';
import { Activity, Pause, Play, Zap } from 'lucide-react';
import './RealTimeFeed.css';

export default function RealTimeFeed() {
  const [events, setEvents] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [stats, setStats] = useState({ eps: 0, total: 0 });
  const scrollRef = useRef(null);

  useEffect(() => {
    // Simulate WebSocket connection
    const interval = setInterval(() => {
      if (isPaused) return;

      const newEvent = {
        id: Date.now(),
        timestamp: new Date(),
        type: ['DNS', 'HTTP', 'TLS', 'SSH', 'SMB'][Math.floor(Math.random() * 5)],
        src: `192.168.1.${Math.floor(Math.random() * 255)}`,
        dst: `10.0.0.${Math.floor(Math.random() * 255)}`,
        info: 'Traffic detected',
        severity: Math.random() > 0.9 ? 'high' : 'info'
      };

      setEvents(prev => {
        const updated = [newEvent, ...prev].slice(0, 50); // Keep last 50
        return updated;
      });

      setStats(prev => ({
        eps: Math.floor(Math.random() * 50) + 10,
        total: prev.total + 1
      }));

    }, 1000); // 1 event per second simulation

    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <div className="feed-container">
      <div className="feed-header">
        <div className="feed-title">
          <Activity className="w-4 h-4 text-green-400" />
          <h3>Live Event Stream</h3>
          <span className="live-indicator">LIVE</span>
        </div>
        <div className="feed-controls">
          <span className="feed-stat">{stats.eps} EPS</span>
          <button 
            className="btn-icon-sm" 
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </button>
        </div>
      </div>

      <div className="feed-content" ref={scrollRef}>
        {events.map(event => (
          <div key={event.id} className={`feed-item ${event.severity}`}>
            <div className="feed-time">
              {event.timestamp.toLocaleTimeString()}
            </div>
            <div className="feed-type">{event.type}</div>
            <div className="feed-details">
              <span className="feed-ip">{event.src}</span>
              <span className="feed-arrow">→</span>
              <span className="feed-ip">{event.dst}</span>
            </div>
            {event.severity === 'high' && (
              <Zap className="w-3 h-3 text-yellow-500" />
            )}
          </div>
        ))}
        {events.length === 0 && (
          <div className="feed-empty">Waiting for events...</div>
        )}
      </div>
    </div>
  );
}
