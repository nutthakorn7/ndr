/**
 * File Analysis Component
 * Visualizes extracted files, YARA matches, and Sandbox results
 */
import { useState, useEffect } from 'react';
import { 
  FileText, Shield, AlertTriangle, CheckCircle, XCircle, 
  Download, Search, Filter, Activity, FileCode, FileArchive, File
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import api from '../utils/api';
import './FileAnalysis.css';

export default function FileAnalysis() {
  const [stats, setStats] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    // Fetch file analysis data from API
    const loadData = async () => {
      setLoading(true);
      try {
        // Try to fetch file analysis stats from API
        const fileStats = await api.getFileStats();
        
        if (fileStats) {
          // Update stats from API
          setStats({
            totalFiles: fileStats.total_files || 0,
            malicious: fileStats.malicious_count || 0,
            suspicious: fileStats.suspicious_count || 0,
            clean: fileStats.clean_count || 0,
            pending: fileStats.pending_count || 0
          });
          
          // For file list, use mock data for now
          throw new Error('Using mock file list data');
        } else {
          throw new Error('No file stats available');
        }
      } catch (error) {
        console.warn('Failed to load file analysis from API, using mock data:', error);
        
        // Mock Stats
        setStats({
          totalFiles: 1245,
          malicious: 23,
          suspicious: 45,
          clean: 1177,
          pending: 5
        });

        // Mock Files
        setFiles([
          { id: 1, name: 'invoice_2023.pdf.exe', type: 'PE32 Executable', size: '1.2 MB', source: '192.168.1.105', dest: '10.0.0.5', status: 'malicious', score: 98, detection: 'Trojan.Win32.Emotet', time: '10m ago' },
          { id: 2, name: 'powershell_script.ps1', type: 'Script', size: '15 KB', source: '192.168.1.112', dest: '10.0.0.5', status: 'suspicious', score: 75, detection: 'Obfuscated Script', time: '45m ago' },
          { id: 3, name: 'quarterly_report.docx', type: 'Document', size: '4.5 MB', source: '192.168.1.200', dest: '10.0.0.5', status: 'clean', score: 0, detection: '-', time: '1h ago' },
          { id: 4, name: 'unknown_binary.bin', type: 'Binary', size: '512 KB', source: '192.168.1.15', dest: 'External', status: 'pending', score: 0, detection: 'Analyzing...', time: '2m ago' },
          { id: 5, name: 'update.zip', type: 'Archive', size: '12 MB', source: 'External', dest: '192.168.1.50', status: 'malicious', score: 100, detection: 'Ransomware.LockBit', time: '3h ago' },
        ]);

      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getFileIcon = (type) => {
    if (type.includes('Executable') || type.includes('Binary')) return <FileCode className="w-4 h-4 text-red-400" />;
    if (type.includes('Script')) return <FileText className="w-4 h-4 text-yellow-400" />;
    if (type.includes('Archive')) return <FileArchive className="w-4 h-4 text-blue-400" />;
    return <File className="w-4 h-4 text-gray-400" />;
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'malicious': return <span className="status-badge danger">Malicious</span>;
      case 'suspicious': return <span className="status-badge warning">Suspicious</span>;
      case 'clean': return <span className="status-badge success">Clean</span>;
      case 'pending': return <span className="status-badge info">Pending</span>;
      default: return <span className="status-badge">Unknown</span>;
    }
  };

  // Chart Data
  const fileTypes = [
    { name: 'Executables', count: 145 },
    { name: 'Scripts', count: 89 },
    { name: 'Documents', count: 450 },
    { name: 'Archives', count: 120 },
    { name: 'Images', count: 441 },
  ];

  if (loading) return <div className="loading-state">Scanning extracted files...</div>;

  return (
    <div className="file-analysis">
      {/* Header Stats */}
      <div className="file-stats-row">
        <div className="file-stat-card">
          <div className="stat-icon bg-blue-500/10 text-blue-400">
            <FileText className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.totalFiles}</div>
            <div className="stat-label">Files Extracted (24h)</div>
          </div>
        </div>
        <div className="file-stat-card">
          <div className="stat-icon bg-red-500/10 text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.malicious}</div>
            <div className="stat-label">Malicious Files</div>
          </div>
        </div>
        <div className="file-stat-card">
          <div className="stat-icon bg-yellow-500/10 text-yellow-400">
            <Activity className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.suspicious}</div>
            <div className="stat-label">Suspicious Files</div>
          </div>
        </div>
        <div className="file-stat-card">
          <div className="stat-icon bg-purple-500/10 text-purple-400">
            <Shield className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.pending}</div>
            <div className="stat-label">Pending Analysis</div>
          </div>
        </div>
      </div>

      <div className="file-content-grid">
        {/* Left Column: File Types Chart */}
        <div className="file-left-col">
          <div className="file-panel">
            <div className="panel-header">
              <h3><FileCode className="w-4 h-4 text-blue-400" /> File Types</h3>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fileTypes} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={10} />
                  <YAxis dataKey="name" type="category" width={80} stroke="#94a3b8" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                    {fileTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Files Table */}
        <div className="file-right-col">
          <div className="file-panel full-height">
            <div className="panel-header">
              <h3><Activity className="w-4 h-4 text-orange-400" /> Recent File Analysis</h3>
              <div className="panel-actions">
                <div className="search-input-sm">
                  <Search className="w-3 h-3" />
                  <input type="text" placeholder="Search files..." />
                </div>
                <button className="btn-icon"><Filter className="w-4 h-4" /></button>
              </div>
            </div>
            <table className="file-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>File Name</th>
                  <th>Type</th>
                  <th>Score</th>
                  <th>Detection</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {files.map(file => (
                  <tr key={file.id}>
                    <td>{getStatusBadge(file.status)}</td>
                    <td>
                      <div className="file-name-cell">
                        {getFileIcon(file.type)}
                        <span className="file-name">{file.name}</span>
                      </div>
                      <div className="file-meta">{file.size} • {file.source}</div>
                    </td>
                    <td className="text-gray-400">{file.type}</td>
                    <td>
                      <div className={`score-badge ${file.score > 80 ? 'critical' : file.score > 50 ? 'high' : 'low'}`}>
                        {file.score}/100
                      </div>
                    </td>
                    <td style={{color: '#fca5a5'}}>{file.detection}</td>
                    <td className="text-gray-500">{file.time}</td>
                    <td>
                      <button className="btn-icon" title="Download Sample">
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
