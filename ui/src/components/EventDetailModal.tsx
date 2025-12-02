import { X, Copy, Download, Shield, Clock, MapPin } from 'lucide-react';
import { useState } from 'react';
import './EventDetailModal.css';

interface ThreatEvent {
  id: number;
  timestamp: string;
  type: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  source: string;
  destination: string;
  protocol?: string;
  description: string;
  details?: any;
}

interface EventDetailModalProps {
  event: ThreatEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EventDetailModal({ event, isOpen, onClose }: EventDetailModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !event) return null;

  const handleCopyJSON = () => {
    const json = JSON.stringify(event, null, 2);
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportJSON = () => {
    const json = JSON.stringify(event, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event_${event.id}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSeverityClass = (severity: string) => {
    return severity.toLowerCase();
  };

  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div className="event-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="event-modal-header">
          <div className="header-left">
            <Shield className="w-6 h-6 text-blue-400" />
            <div>
              <h2>Threat Event Details</h2>
              <span className="event-id">Event ID: {event.id}</span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="event-modal-body">
          {/* Metadata Section */}
          <div className="metadata-section">
            <div className="metadata-grid">
              <div className="metadata-item">
                <label>Severity</label>
                <span className={`severity-badge ${getSeverityClass(event.severity)}`}>
                  {event.severity}
                </span>
              </div>
              <div className="metadata-item">
                <label>Type</label>
                <span className="type-badge">{event.type}</span>
              </div>
              <div className="metadata-item">
                <label>
                  <Clock className="w-4 h-4 inline mr-1" />
                  Timestamp
                </label>
                <span className="mono">{event.timestamp}</span>
              </div>
              <div className="metadata-item">
                <label>Protocol</label>
                <span className="mono">{event.protocol || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Network Info Section */}
          <div className="network-section">
            <h3>
              <MapPin className="w-4 h-4 inline mr-2" />
              Network Information
            </h3>
            <div className="network-grid">
              <div className="network-item">
                <label>Source IP</label>
                <span className="mono highlight">{event.source}</span>
              </div>
              <div className="network-item">
                <label>Destination IP</label>
                <span className="mono highlight">{event.destination}</span>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="description-section">
            <h3>Description</h3>
            <p>{event.description}</p>
          </div>

          {/* JSON Details Section */}
          <div className="json-section">
            <div className="json-header">
              <h3>Event Data (JSON)</h3>
              <div className="json-actions">
                <button 
                  className="btn-sm btn-secondary" 
                  onClick={handleCopyJSON}
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy JSON'}
                </button>
                <button 
                  className="btn-sm btn-primary" 
                  onClick={handleExportJSON}
                >
                  <Download className="w-4 h-4" />
                  Export JSON
                </button>
              </div>
            </div>
            <pre className="json-content">
              {JSON.stringify(event, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="event-modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
