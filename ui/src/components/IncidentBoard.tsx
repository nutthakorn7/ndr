import { useState } from 'react';
import { 
  AlertTriangle, Clock, User, Tag, MessageSquare, 
  CheckCircle, ArrowLeft, Send, MoreVertical, 
  Monitor, Shield, Calendar, Filter, Plus
} from 'lucide-react';
import { mockIncidents, Incident, IncidentTimelineItem } from '../utils/mockIncidents';
import './IncidentDetail.css';

export default function IncidentBoard() {
  const [incidents, setIncidents] = useState<Incident[]>(mockIncidents);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [newComment, setNewComment] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Filter incidents
  const filteredIncidents = filterStatus === 'all' 
    ? incidents 
    : incidents.filter(i => i.status === filterStatus);

  // Group by status for Kanban view
  const columns = {
    New: filteredIncidents.filter(i => i.status === 'New'),
    Investigating: filteredIncidents.filter(i => i.status === 'Investigating'),
    Resolved: filteredIncidents.filter(i => i.status === 'Resolved'),
    'False Positive': filteredIncidents.filter(i => i.status === 'False Positive')
  };

  const handleStatusChange = (incidentId: string, newStatus: Incident['status']) => {
    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        const timelineItem: IncidentTimelineItem = {
          id: `t-${Date.now()}`,
          type: 'status_change',
          user: 'You',
          timestamp: new Date().toISOString(),
          content: `Status changed from ${inc.status} to ${newStatus}`
        };
        return { ...inc, status: newStatus, timeline: [timelineItem, ...inc.timeline] };
      }
      return inc;
    }));
    
    if (selectedIncident && selectedIncident.id === incidentId) {
      setSelectedIncident(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const handleAddComment = () => {
    if (!selectedIncident || !newComment.trim()) return;

    const comment: IncidentTimelineItem = {
      id: `c-${Date.now()}`,
      type: 'comment',
      user: 'You',
      timestamp: new Date().toISOString(),
      content: newComment
    };

    setIncidents(prev => prev.map(inc => {
      if (inc.id === selectedIncident.id) {
        return { ...inc, timeline: [comment, ...inc.timeline] };
      }
      return inc;
    }));

    setSelectedIncident(prev => prev ? { 
      ...prev, 
      timeline: [comment, ...prev.timeline] 
    } : null);
    
    setNewComment('');
  };

  // Detail View
  if (selectedIncident) {
    return (
      <div className="incident-detail-container">
        <div className="detail-main">
          <div className="detail-header-card">
            <div className="header-top">
              <div>
                <button 
                  className="btn-text mb-2 flex items-center gap-1 text-sm text-muted"
                  onClick={() => setSelectedIncident(null)}
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Board
                </button>
                <div className="incident-id">{selectedIncident.id}</div>
                <div className="header-title">
                  <h2>{selectedIncident.title}</h2>
                </div>
              </div>
              <div className="header-actions">
                <select 
                  className="bg-slate-800 border border-slate-600 rounded px-3 py-1 text-sm"
                  value={selectedIncident.status}
                  onChange={(e) => handleStatusChange(selectedIncident.id, e.target.value as any)}
                >
                  <option value="New">New</option>
                  <option value="Investigating">Investigating</option>
                  <option value="Resolved">Resolved</option>
                  <option value="False Positive">False Positive</option>
                </select>
                <button className="btn-icon">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="header-meta-grid">
              <div className="meta-item">
                <label>Severity</label>
                <div><span className={`badge ${selectedIncident.severity}`}>{selectedIncident.severity}</span></div>
              </div>
              <div className="meta-item">
                <label>Assignee</label>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {selectedIncident.assignee || 'Unassigned'}
                </div>
              </div>
              <div className="meta-item">
                <label>Created</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(selectedIncident.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="meta-item">
                <label>Related Alerts</label>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {selectedIncident.related_alerts}
                </div>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <div className="section-title">
              <Shield className="w-5 h-5" /> Description
            </div>
            <p className="text-slate-300 leading-relaxed">
              {selectedIncident.description}
            </p>
            <div className="mt-4 flex gap-2">
              {selectedIncident.tags.map(tag => (
                <span key={tag} className="tag flex items-center gap-1">
                  <Tag className="w-3 h-3" /> {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="detail-section">
            <div className="section-title">
              <Monitor className="w-5 h-5" /> Affected Assets
            </div>
            <div className="assets-list">
              {selectedIncident.affected_assets.map(asset => (
                <div key={asset} className="asset-item">
                  <Monitor className="w-4 h-4 text-blue-400" />
                  {asset}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="detail-sidebar">
          <div className="sidebar-tabs">
            <button className="sidebar-tab active">Timeline & Notes</button>
          </div>
          
          <div className="sidebar-content">
            {selectedIncident.timeline.map(item => (
              <div key={item.id} className="timeline-item">
                <div className="timeline-icon">
                  {item.type === 'comment' ? <MessageSquare className="w-3 h-3" /> : 
                   item.type === 'status_change' ? <CheckCircle className="w-3 h-3" /> : 
                   <Clock className="w-3 h-3" />}
                </div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <span className="timeline-user">{item.user}</span>
                    <span className="timeline-time">
                      {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <div className="timeline-text">
                    {item.content}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="comment-input-area">
            <textarea
              className="comment-input"
              placeholder="Add a note..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
            />
            <button 
              className="btn-primary p-2 rounded"
              onClick={handleAddComment}
              disabled={!newComment.trim()}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Board View
  return (
    <div className="incident-board">
      <div className="board-header">
        <div className="flex gap-4 items-center">
          <h2 className="text-xl font-semibold">Incident Response Board</h2>
          <div className="board-filters">
            <button 
              className={`btn-sm ${filterStatus === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterStatus('all')}
            >
              All
            </button>
            <button 
              className={`btn-sm ${filterStatus === 'New' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterStatus('New')}
            >
              New
            </button>
            <button 
              className={`btn-sm ${filterStatus === 'Investigating' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterStatus('Investigating')}
            >
              Investigating
            </button>
          </div>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Incident
        </button>
      </div>

      <div className="board-columns">
        {Object.entries(columns).map(([status, items]) => (
          <div key={status} className="board-column">
            <div className="column-header">
              <span>{status}</span>
              <span className="bg-slate-700 px-2 py-0.5 rounded text-xs">{items.length}</span>
            </div>
            {items.map(incident => (
              <div 
                key={incident.id} 
                className="incident-card"
                onClick={() => setSelectedIncident(incident)}
              >
                <div className="card-header">
                  <div className="card-title">{incident.title}</div>
                  <span className={`badge ${incident.severity}`}>{incident.severity}</span>
                </div>
                <div className="text-xs text-muted line-clamp-2">
                  {incident.description}
                </div>
                <div className="card-meta">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" /> {incident.assignee || 'Unassigned'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(incident.updated_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
