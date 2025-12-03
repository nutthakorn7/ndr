import { useState, useEffect } from 'react';
import { Activity, ChevronDown, ChevronUp, AlertCircle, Shield, Globe } from 'lucide-react';
import { useRealTime } from '../utils/hooks';
import api from '../utils/api';
import './EventTicker.css';

interface TickerEvent {
  id: string | number;
  timestamp: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  source: string;
  destination: string;
  description: string;
}

export default function EventTicker() {
  const [isMinimized, setIsMinimized] = useState(false);
  const [events, setEvents] = useState<TickerEvent[]>([]);
  
  // Use real-time hook to fetch events every 10 seconds
  const { data } = useRealTime(async () => {
    try {
      // Fetch latest 20 events
      const response = await api.getEvents({ limit: 20 });
      return response.events || [];
    } catch (e) {
      console.warn('Failed to fetch ticker events', e);
      return [];
    }
  }, 10000);

  useEffect(() => {
    if (data) {
      // Map API data to TickerEvent format if needed
      // Assuming API returns compatible structure or mapping here
      const mappedEvents = data.map((e: any) => ({
        id: e.id,
        timestamp: new Date(e.timestamp).toLocaleTimeString(),
        type: e.type || 'Unknown',
        severity: (e.severity || 'info').toLowerCase(),
        source: e.source_ip || e.source || 'N/A',
        destination: e.dest_ip || e.destination || 'N/A',
        description: e.description || e.title || 'Security Event'
      }));
      setEvents(mappedEvents);
    }
  }, [data]);

  // If no data yet, use some placeholders to show the UI
  const displayEvents = events.length > 0 ? events : [
    { id: 1, timestamp: '12:00:01', type: 'System', severity: 'info', source: 'System', destination: 'Local', description: 'Monitoring Active' }
  ] as TickerEvent[];

  return (
    <>
      {isMinimized && (
        <button 
          className="ticker-toggle-btn"
          onClick={() => setIsMinimized(false)}
        >
          <Activity size={12} className="text-green-400" />
          LIVE FEED
          <ChevronUp size={12} />
        </button>
      )}
      
      <div className={`event-ticker ${isMinimized ? 'minimized' : ''}`}>
        <div className="ticker-label">
          <div className="live-indicator" />
          LIVE THREAT FEED
        </div>
        
        <div className="ticker-content">
          <div className="ticker-track">
            {displayEvents.map((event) => (
              <div key={event.id} className="ticker-item">
                <span className="event-time">[{event.timestamp}]</span>
                <span className={`event-type ${event.severity}`}>
                  {event.severity === 'critical' || event.severity === 'high' ? <AlertCircle size={12} /> : <Shield size={12} />}
                  {event.type.toUpperCase()}
                </span>
                <span className="event-details">
                  {event.source} &rarr; {event.destination} : {event.description}
                </span>
              </div>
            ))}
            {/* Duplicate for seamless loop if needed, though CSS handles it mostly */}
          </div>
        </div>

        <div className="ticker-controls">
          <button 
            className="btn-icon" 
            onClick={() => setIsMinimized(true)}
            title="Minimize Feed"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
