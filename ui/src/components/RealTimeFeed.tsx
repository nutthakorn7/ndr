/**
 * Real-Time Event Feed
 * Live streaming of security events via WebSockets
 */
import { useState, useEffect, useRef } from 'react';
import { Activity, Pause, Play, Zap, Wifi, WifiOff } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import './RealTimeFeed.css';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

interface FeedEvent {
  id: string | number;
  timestamp: Date;
  type: string;
  src: string;
  dst: string;
  info: string;
  severity: 'high' | 'info';
}

interface FeedStats {
  eps: number;
  total: number;
}

export default function RealTimeFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [stats, setStats] = useState<FeedStats>({ eps: 0, total: 0 });
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastFetchTime = useRef<number>(Date.now());
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize Socket.IO connection
    const socket = io(SOCKET_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      setIsConnected(true);
      setConnectionError(false);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('WebSocket connection error:', err);
      setConnectionError(true);
      setIsConnected(false);
    });

    socket.on('alert', (alert) => {
      if (isPaused) return;

      const newEvent = {
        id: alert.id,
        timestamp: new Date(alert.timestamp),
        type: alert.severity?.toUpperCase() || 'INFO',
        src: alert.source_ip || 'N/A',
        dst: alert.destination_ip || 'N/A',
        info: alert.title || alert.description || 'Alert detected',
        severity: mapSeverity(alert.severity)
      };

      setEvents(prev => {
        const combined = [newEvent, ...prev];
        return combined.slice(0, 50);
      });

      // Update EPS
      const now = Date.now();
      const timeDiff = (now - lastFetchTime.current) / 1000;
      // Simple moving average for EPS
      const currentEps = timeDiff > 0 ? 1 / timeDiff : 0;
      lastFetchTime.current = now;

      setStats(prev => ({
        eps: Math.round(currentEps * 10) / 10, // 1 decimal place
        total: prev.total + 1
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [isPaused]);

  // Fallback: Generate mock events if connection fails
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (connectionError && !isPaused) {
      interval = setInterval(() => {
        const newEvent = {
          id: `mock-${Date.now()}`,
          timestamp: new Date(),
          type: ['DNS', 'HTTP', 'TLS', 'SSH', 'SMB'][Math.floor(Math.random() * 5)],
          src: `192.168.1.${Math.floor(Math.random() * 255)}`,
          dst: `10.0.0.${Math.floor(Math.random() * 255)}`,
          info: 'Traffic detected (mock fallback)',
          severity: (Math.random() > 0.9 ? 'high' : 'info') as 'high' | 'info'
        };

        setEvents(prev => [newEvent, ...prev].slice(0, 50));
        setStats(prev => ({
          eps: Math.floor(Math.random() * 50) + 10,
          total: prev.total + 1
        }));
      }, 2000);
    }

    return () => clearInterval(interval);
  }, [connectionError, isPaused]);

  // Map alert severity to feed severity
  const mapSeverity = (severity?: string): 'high' | 'info' => {
    if (!severity) return 'info';
    const sev = severity.toLowerCase();
    if (sev === 'critical' || sev === 'high') return 'high';
    return 'info';
  };

  return (
    <div className="feed-container">
      <div className="feed-header">
        <div className="feed-title">
          <Activity className="w-4 h-4 text-green-400" />
          <h3>Live Event Stream</h3>
          {isConnected ? (
            <span className="live-indicator flex items-center gap-1">
              <Wifi className="w-3 h-3" /> LIVE
            </span>
          ) : (
            <span className="live-indicator offline flex items-center gap-1 text-yellow-500">
              <WifiOff className="w-3 h-3" /> {connectionError ? 'OFFLINE (Mock)' : 'CONNECTING'}
            </span>
          )}
        </div>
        <div className="feed-controls">
          <span className="feed-stat">{Math.round(stats.eps)} EPS</span>
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
