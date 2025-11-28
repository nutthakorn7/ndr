/**
 * Asset Discovery Component
 * Manages discovered network assets and their details
 */
import { useState, useEffect } from 'react';
import { 
  Server, Search, Filter, Smartphone, Laptop, 
  Monitor, Printer, Wifi, Shield, AlertCircle,
  ChevronRight, Clock, Globe
} from 'lucide-react';
import './AssetDiscovery.css';

export default function AssetDiscovery() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Simulate fetching asset data
    const loadAssets = async () => {
      setLoading(true);
      try {
        await new Promise(r => setTimeout(r, 800));
        
        const mockAssets = [
          { 
            id: 'asset-01', 
            ip: '192.168.1.105', 
            mac: '00:1A:2B:3C:4D:5E',
            hostname: 'finance-workstation-01',
            type: 'workstation',
            os: 'Windows 11 Pro',
            vendor: 'Dell',
            firstSeen: '2023-10-15T08:30:00',
            lastSeen: 'Just now',
            riskScore: 15,
            openPorts: [135, 139, 445, 3389],
            tags: ['finance', 'restricted']
          },
          { 
            id: 'asset-02', 
            ip: '192.168.1.200', 
            mac: 'AA:BB:CC:DD:EE:FF',
            hostname: 'dc-primary',
            type: 'server',
            os: 'Windows Server 2019',
            vendor: 'VMware',
            firstSeen: '2023-09-01T00:00:00',
            lastSeen: 'Just now',
            riskScore: 5,
            openPorts: [53, 88, 135, 389, 445, 464, 636, 3268, 3269],
            tags: ['infrastructure', 'critical']
          },
          { 
            id: 'asset-03', 
            ip: '192.168.1.15', 
            mac: '11:22:33:44:55:66',
            hostname: 'dev-macbook-pro',
            type: 'laptop',
            os: 'macOS Sonoma 14.2',
            vendor: 'Apple',
            firstSeen: '2023-11-20T09:15:00',
            lastSeen: '5m ago',
            riskScore: 45,
            openPorts: [22, 8080, 3000],
            tags: ['developer', 'wifi']
          },
          { 
            id: 'asset-04', 
            ip: '10.0.0.50', 
            mac: '99:88:77:66:55:44',
            hostname: 'iot-camera-lobby',
            type: 'iot',
            os: 'Linux (Embedded)',
            vendor: 'Hikvision',
            firstSeen: '2023-08-10T14:20:00',
            lastSeen: 'Just now',
            riskScore: 85,
            openPorts: [80, 554],
            tags: ['iot', 'surveillance']
          },
          { 
            id: 'asset-05', 
            ip: '192.168.1.254', 
            mac: '12:34:56:78:90:AB',
            hostname: 'gateway-router',
            type: 'network',
            os: 'Cisco IOS',
            vendor: 'Cisco',
            firstSeen: '2023-01-01T00:00:00',
            lastSeen: 'Just now',
            riskScore: 0,
            openPorts: [22, 80, 443],
            tags: ['network', 'gateway']
          }
        ];
        setAssets(mockAssets);
      } catch (error) {
        console.error('Failed to load assets:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAssets();
  }, []);

  const getAssetIcon = (type) => {
    switch(type) {
      case 'server': return <Server className="w-5 h-5 text-purple-400" />;
      case 'workstation': return <Monitor className="w-5 h-5 text-blue-400" />;
      case 'laptop': return <Laptop className="w-5 h-5 text-blue-300" />;
      case 'iot': return <Wifi className="w-5 h-5 text-orange-400" />;
      case 'mobile': return <Smartphone className="w-5 h-5 text-green-400" />;
      case 'printer': return <Printer className="w-5 h-5 text-gray-400" />;
      default: return <Globe className="w-5 h-5 text-gray-400" />;
    }
  };

  const getRiskBadge = (score) => {
    if (score >= 75) return <span className="risk-badge critical">Critical ({score})</span>;
    if (score >= 50) return <span className="risk-badge high">High ({score})</span>;
    if (score >= 25) return <span className="risk-badge medium">Medium ({score})</span>;
    return <span className="risk-badge low">Low ({score})</span>;
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = 
      asset.ip.includes(searchTerm) || 
      asset.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.mac.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filter === 'all' || asset.type === filter;
    
    return matchesSearch && matchesFilter;
  });

  if (loading) return <div className="loading-state">Scanning network for assets...</div>;

  return (
    <div className="asset-discovery">
      {/* Header Stats */}
      <div className="asset-stats-row">
        <div className="asset-stat-card">
          <div className="stat-icon bg-blue-500/10 text-blue-400">
            <Server className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{assets.length}</div>
            <div className="stat-label">Total Assets</div>
          </div>
        </div>
        <div className="asset-stat-card">
          <div className="stat-icon bg-green-500/10 text-green-400">
            <Clock className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">3</div>
            <div className="stat-label">New (24h)</div>
          </div>
        </div>
        <div className="asset-stat-card">
          <div className="stat-icon bg-red-500/10 text-red-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">2</div>
            <div className="stat-label">High Risk</div>
          </div>
        </div>
      </div>

      <div className="asset-content-split">
        {/* Asset List */}
        <div className={`asset-list-panel ${selectedAsset ? 'shrink' : ''}`}>
          <div className="panel-controls">
            <div className="search-input">
              <Search className="w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search IP, Hostname, MAC..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-tabs">
              <button 
                className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >All</button>
              <button 
                className={`filter-tab ${filter === 'server' ? 'active' : ''}`}
                onClick={() => setFilter('server')}
              >Servers</button>
              <button 
                className={`filter-tab ${filter === 'workstation' ? 'active' : ''}`}
                onClick={() => setFilter('workstation')}
              >Workstations</button>
              <button 
                className={`filter-tab ${filter === 'iot' ? 'active' : ''}`}
                onClick={() => setFilter('iot')}
              >IoT</button>
            </div>
          </div>

          <div className="asset-table-container">
            <table className="asset-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Asset Name</th>
                  <th>IP Address</th>
                  <th>OS / Vendor</th>
                  <th>Risk</th>
                  <th>Last Seen</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map(asset => (
                  <tr 
                    key={asset.id} 
                    className={selectedAsset?.id === asset.id ? 'active' : ''}
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <td>{getAssetIcon(asset.type)}</td>
                    <td>
                      <div className="asset-name">{asset.hostname}</div>
                      <div className="asset-mac">{asset.mac}</div>
                    </td>
                    <td className="mono">{asset.ip}</td>
                    <td>
                      <div className="asset-os">{asset.os}</div>
                      <div className="asset-vendor">{asset.vendor}</div>
                    </td>
                    <td>{getRiskBadge(asset.riskScore)}</td>
                    <td className="text-gray-400">{asset.lastSeen}</td>
                    <td><ChevronRight className="w-4 h-4 text-gray-500" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Asset Details Sidebar */}
        {selectedAsset && (
          <div className="asset-details-sidebar">
            <div className="sidebar-header">
              <h3>Asset Details</h3>
              <button className="close-btn" onClick={() => setSelectedAsset(null)}>×</button>
            </div>
            
            <div className="sidebar-content">
              <div className="detail-hero">
                <div className="hero-icon">
                  {getAssetIcon(selectedAsset.type)}
                </div>
                <div className="hero-info">
                  <h2>{selectedAsset.hostname}</h2>
                  <div className="hero-ip">{selectedAsset.ip}</div>
                </div>
              </div>

              <div className="detail-section">
                <h4>Identity</h4>
                <div className="detail-row">
                  <span className="label">MAC Address</span>
                  <span className="value mono">{selectedAsset.mac}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Vendor</span>
                  <span className="value">{selectedAsset.vendor}</span>
                </div>
                <div className="detail-row">
                  <span className="label">OS</span>
                  <span className="value">{selectedAsset.os}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Type</span>
                  <span className="value capitalize">{selectedAsset.type}</span>
                </div>
              </div>

              <div className="detail-section">
                <h4>Network Profile</h4>
                <div className="detail-row">
                  <span className="label">First Seen</span>
                  <span className="value">{new Date(selectedAsset.firstSeen).toLocaleDateString()}</span>
                </div>
                <div className="detail-tags">
                  {selectedAsset.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </div>

              <div className="detail-section">
                <h4>Open Ports</h4>
                <div className="ports-grid">
                  {selectedAsset.openPorts.map(port => (
                    <div key={port} className="port-badge">
                      <span className="port-number">{port}</span>
                      <span className="port-proto">TCP</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="detail-actions">
                <button className="btn-primary full-width">View Traffic History</button>
                <button className="btn-secondary full-width">Scan for Vulnerabilities</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
