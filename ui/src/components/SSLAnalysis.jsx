/**
 * SSL/TLS Analysis Component
 * Visualizes TLS versions, cipher suites, and certificate hygiene
 */
import { useState, useEffect } from 'react';
import { 
  Lock, Shield, AlertTriangle, CheckCircle, XCircle, 
  Server, Globe, FileText, RefreshCw, Key
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import './SSLAnalysis.css';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function SSLAnalysis() {
  const [stats, setStats] = useState(null);
  const [tlsVersions, setTlsVersions] = useState([]);
  const [cipherSuites, setCipherSuites] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching SSL data
    const loadData = async () => {
      setLoading(true);
      try {
        await new Promise(r => setTimeout(r, 700));
        
        // Mock Stats
        setStats({
          totalConnections: 452890,
          securePercentage: 98.2,
          expiredCerts: 12,
          weakCiphers: 450
        });

        // Mock TLS Versions
        setTlsVersions([
          { name: 'TLS 1.3', value: 65 },
          { name: 'TLS 1.2', value: 30 },
          { name: 'TLS 1.1', value: 3 },
          { name: 'TLS 1.0', value: 1 },
          { name: 'SSLv3', value: 1 },
        ]);

        // Mock Cipher Suites
        setCipherSuites([
          { name: 'TLS_AES_128_GCM_SHA256', count: 150000 },
          { name: 'TLS_AES_256_GCM_SHA384', count: 120000 },
          { name: 'ECDHE-RSA-AES128-GCM-SHA256', count: 80000 },
          { name: 'ECDHE-RSA-AES256-GCM-SHA384', count: 60000 },
          { name: 'Other', count: 42890 },
        ]);

        // Mock Certificates
        setCertificates([
          { id: 1, subject: 'internal-db.corp.local', issuer: 'Corp-CA', type: 'Self-signed', status: 'expired', expiry: '2023-11-01' },
          { id: 2, subject: 'legacy-app.corp.local', issuer: 'Corp-CA', type: 'RSA 1024', status: 'weak', expiry: '2024-05-15' },
          { id: 3, subject: 'test-env.dev', issuer: 'Dev-CA', type: 'Self-signed', status: 'valid', expiry: '2024-12-20' },
          { id: 4, subject: 'payment-gateway.corp', issuer: 'DigiCert', type: 'RSA 2048', status: 'valid', expiry: '2025-01-10' },
          { id: 5, subject: 'vpn.corp.net', issuer: 'Let\'s Encrypt', type: 'ECDSA', status: 'valid', expiry: '2024-02-28' },
        ]);

      } catch (error) {
        console.error('Failed to load SSL analysis:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) return <div className="loading-state">Analyzing SSL/TLS traffic...</div>;

  return (
    <div className="ssl-analysis">
      {/* Header Stats */}
      <div className="ssl-stats-row">
        <div className="ssl-stat-card">
          <div className="stat-icon bg-green-500/10 text-green-400">
            <Lock className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.securePercentage}%</div>
            <div className="stat-label">Encrypted Traffic</div>
          </div>
        </div>
        <div className="ssl-stat-card">
          <div className="stat-icon bg-red-500/10 text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.expiredCerts}</div>
            <div className="stat-label">Expired Certs</div>
          </div>
        </div>
        <div className="ssl-stat-card">
          <div className="stat-icon bg-yellow-500/10 text-yellow-400">
            <Shield className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.weakCiphers}</div>
            <div className="stat-label">Weak Ciphers</div>
          </div>
        </div>
        <div className="ssl-stat-card">
          <div className="stat-icon bg-blue-500/10 text-blue-400">
            <Globe className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{(stats?.totalConnections / 1000).toFixed(1)}k</div>
            <div className="stat-label">Total Connections</div>
          </div>
        </div>
      </div>

      <div className="ssl-content-grid">
        {/* Charts Column */}
        <div className="ssl-charts-col">
          {/* TLS Versions */}
          <div className="ssl-panel">
            <div className="panel-header">
              <h3><Key className="w-4 h-4 text-blue-400" /> TLS Version Distribution</h3>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tlsVersions}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {tlsVersions.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  />
                  <Legend layout="vertical" verticalAlign="middle" align="right" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cipher Suites */}
          <div className="ssl-panel">
            <div className="panel-header">
              <h3><Shield className="w-4 h-4 text-purple-400" /> Top Cipher Suites</h3>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cipherSuites} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={10} />
                  <YAxis dataKey="name" type="category" width={150} stroke="#94a3b8" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Certificates Table */}
        <div className="ssl-table-col">
          <div className="ssl-panel full-height">
            <div className="panel-header">
              <h3><FileText className="w-4 h-4 text-orange-400" /> Certificate Hygiene</h3>
              <button className="btn-secondary">
                <RefreshCw className="w-3 h-3" /> Scan
              </button>
            </div>
            <table className="ssl-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Subject (CN)</th>
                  <th>Issuer</th>
                  <th>Type</th>
                  <th>Expiry</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map(cert => (
                  <tr key={cert.id}>
                    <td>
                      {cert.status === 'valid' && <span className="status-badge success">Valid</span>}
                      {cert.status === 'expired' && <span className="status-badge danger">Expired</span>}
                      {cert.status === 'weak' && <span className="status-badge warning">Weak</span>}
                    </td>
                    <td className="mono text-white">{cert.subject}</td>
                    <td className="text-gray-400">{cert.issuer}</td>
                    <td className="text-gray-400">{cert.type}</td>
                    <td className="mono text-gray-400">{cert.expiry}</td>
                    <td>
                      <button className="btn-xs">Details</button>
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
