/**
 * Sensor Management Component
 * Monitor and manage distributed NDR sensors
 */
import { useState, useEffect } from 'react';
import { 
  Server, Activity, Cpu, HardDrive, Wifi, 
  CheckCircle, AlertTriangle, XCircle, RefreshCw, Terminal
} from 'lucide-react';
import api from '../utils/api';
import './SensorManagement.css';

interface SensorMetrics {
  cpu: number;
  ram: number;
  disk: number;
  bytes_per_sec?: number;
}

interface Sensor {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'warning' | 'offline';
  ip: string;
  uptime: string;
  cpu: number;
  ram: number;
  disk: number;
  interface: string;
  traffic: string;
  version: string;
  last_heartbeat?: string;
  last_metrics?: SensorMetrics;
}

export default function SensorManagement() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);

  useEffect(() => {
    // Helper function for uptime formatting
    const formatUptime = (lastHeartbeat?: string) => {
      if (!lastHeartbeat) return '-';
      // Example: Convert lastHeartbeat (timestamp or date string) to uptime string
      // This is a placeholder, actual implementation might vary based on API response
      const now = new Date();
      const heartbeatDate = new Date(lastHeartbeat);
      const diffMs = now.getTime() - heartbeatDate.getTime();
      if (diffMs < 0) return '0d 0h 0m'; // Future heartbeat, should not happen
      
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      return `${days}d ${hours}h ${minutes}m`;
    };

    // Helper function for traffic formatting
    const formatTraffic = (bytesPerSec?: number) => {
      if (typeof bytesPerSec !== 'number' || bytesPerSec < 0) return '0 Mbps';
      // Convert bytes/sec to Mbps
      const mbps = (bytesPerSec * 8) / (1000 * 1000);
      return `${mbps.toFixed(2)} Mbps`;
    };

    // Fetch sensor data from API
    const loadSensors = async () => {
      setLoading(true);
      try {
        // Try to fetch real sensor data
        const response = await api.getSensors();
        
        // Handle response from edge-coordinator (proxied via dashboard-api)
        // Expected format: { agents: [...], total: N }
        if (response && response.agents) {
          // Transform API response to component format
          const transformedSensors = response.agents.map((agent: any) => ({
            id: agent.agent_id, // Map agent_id to id
            name: agent.name || agent.agent_id,
            location: agent.location || 'Unknown',
            status: agent.status,
            ip: 'N/A', // IP might not be in the basic agent list, or needs to be extracted from metadata
            uptime: formatUptime(agent.last_heartbeat),
            cpu: agent.last_metrics?.cpu || 0,
            ram: agent.last_metrics?.ram || 0,
            disk: agent.last_metrics?.disk || 0,
            interface: 'eth0', // Placeholder
            traffic: formatTraffic(agent.last_metrics?.bytes_per_sec),
            version: agent.version || 'Unknown'
          }));
          setSensors(transformedSensors);
          if (transformedSensors.length > 0) {
            setSelectedSensor(transformedSensors[0]);
          }
        } else if (response && response.sensors) {
           // Fallback for legacy format if any
           // ... (existing logic)
           const transformedSensors = response.sensors.map((sensor: any) => ({
            id: sensor.id,
            name: sensor.name,
            location: sensor.location || 'Unknown',
            status: sensor.status,
            ip: sensor.ip_address || sensor.ip || 'N/A',
            uptime: formatUptime(sensor.last_heartbeat),
            cpu: sensor.last_metrics?.cpu || 0,
            ram: sensor.last_metrics?.ram || 0,
            disk: sensor.last_metrics?.disk || 0,
            interface: sensor.interface || 'eth0',
            traffic: formatTraffic(sensor.last_metrics?.bytes_per_sec),
            version: sensor.version || '2.4.0'
          }));
          setSensors(transformedSensors);
        } else {
          throw new Error('Invalid sensor response');
        }
      } catch (error) {
        console.warn('Failed to load sensors from API, using mock data:', error);
        
        const mockSensors: Sensor[] = [
          { 
            id: 'sensor-01', 
            name: 'Gateway-Primary', 
            location: 'HQ Server Room', 
            status: 'online', 
            ip: '192.168.1.5',
            uptime: '14d 2h 15m',
            cpu: 45,
            ram: 62,
            disk: 28,
            interface: 'eth0',
            traffic: '850 Mbps',
            version: '2.4.0'
          },
          { 
            id: 'sensor-02', 
            name: 'Gateway-Backup', 
            location: 'HQ Server Room', 
            status: 'online', 
            ip: '192.168.1.6',
            uptime: '45d 12h 30m',
            cpu: 12,
            ram: 34,
            disk: 15,
            interface: 'eth0',
            traffic: '12 Mbps',
            version: '2.4.0'
          },
          { 
            id: 'sensor-03', 
            name: 'Branch-NY', 
            location: 'New York Office', 
            status: 'warning', 
            ip: '10.50.1.5',
            uptime: '2d 5h 10m',
            cpu: 88,
            ram: 75,
            disk: 45,
            interface: 'eth1',
            traffic: '120 Mbps',
            version: '2.3.5'
          },
          { 
            id: 'sensor-04', 
            name: 'Branch-LDN', 
            location: 'London Office', 
            status: 'offline', 
            ip: '10.60.1.5',
            uptime: '-',
            cpu: 0,
            ram: 0,
            disk: 0,
            interface: '-',
            traffic: '-',
            version: '2.3.5'
          },
          { 
            id: 'sensor-05', 
            name: 'Cloud-AWS-East', 
            location: 'AWS us-east-1', 
            status: 'online', 
            ip: '172.16.0.100',
            uptime: '120d 1h 5m',
            cpu: 25,
            ram: 40,
            disk: 12,
            interface: 'ens5',
            traffic: '450 Mbps',
            version: '2.4.0'
          }
        ];
        setSensors(mockSensors);
        setSelectedSensor(mockSensors[0]);
      } finally {
        setLoading(false);
      }
    };

    loadSensors();
  }, []);

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'online': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'offline': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'online': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'warning': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'offline': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  if (loading) return <div className="loading-state">Loading sensor fleet...</div>;

  return (
    <div className="sensor-management">
      <div className="sensor-header">
        <div className="header-title">
          <h2>Sensor Fleet Management</h2>
          <div className="fleet-stats">
            <span className="stat-badge success">3 Online</span>
            <span className="stat-badge warning">1 Warning</span>
            <span className="stat-badge danger">1 Offline</span>
          </div>
        </div>
        <button className="btn-primary">
          <RefreshCw className="w-4 h-4" /> Refresh Fleet
        </button>
      </div>

      <div className="sensor-content">
        {/* Sensor List */}
        <div className="sensor-list-panel">
          <div className="panel-header">
            <h3>Sensors</h3>
          </div>
          <div className="sensor-list">
            {sensors.map(sensor => (
              <div 
                key={sensor.id} 
                className={`sensor-item ${selectedSensor?.id === sensor.id ? 'active' : ''}`}
                onClick={() => setSelectedSensor(sensor)}
              >
                <div className="sensor-item-header">
                  <span className="sensor-name">{sensor.name}</span>
                  {getStatusIcon(sensor.status)}
                </div>
                <div className="sensor-item-meta">
                  <span>{sensor.ip}</span>
                  <span className={`status-text ${sensor.status}`}>{sensor.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sensor Details */}
        {selectedSensor && (
          <div className="sensor-details-panel">
            <div className="details-header">
              <div className="details-title">
                <Server className="w-6 h-6 text-blue-400" />
                <div>
                  <h3>{selectedSensor.name}</h3>
                  <span className="sensor-id">{selectedSensor.id}</span>
                </div>
              </div>
              <div className={`sensor-status-badge ${getStatusColor(selectedSensor.status)}`}>
                {selectedSensor.status.toUpperCase()}
              </div>
            </div>

            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-header">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span>CPU Usage</span>
                </div>
                <div className="metric-value">{selectedSensor.cpu}%</div>
                <div className="progress-bar">
                  <div 
                    className={`progress-fill ${selectedSensor.cpu > 80 ? 'danger' : 'primary'}`}
                    style={{width: `${selectedSensor.cpu}%`}}
                  ></div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <span>RAM Usage</span>
                </div>
                <div className="metric-value">{selectedSensor.ram}%</div>
                <div className="progress-bar">
                  <div 
                    className={`progress-fill ${selectedSensor.ram > 80 ? 'danger' : 'primary'}`}
                    style={{width: `${selectedSensor.ram}%`}}
                  ></div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <HardDrive className="w-4 h-4 text-green-400" />
                  <span>Disk Usage</span>
                </div>
                <div className="metric-value">{selectedSensor.disk}%</div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill success"
                    style={{width: `${selectedSensor.disk}%`}}
                  ></div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <Wifi className="w-4 h-4 text-orange-400" />
                  <span>Traffic</span>
                </div>
                <div className="metric-value">{selectedSensor.traffic}</div>
                <div className="metric-sub">Interface: {selectedSensor.interface}</div>
              </div>
            </div>

            <div className="details-info-grid">
              <div className="info-group">
                <label>Location</label>
                <div>{selectedSensor.location}</div>
              </div>
              <div className="info-group">
                <label>IP Address</label>
                <div className="mono">{selectedSensor.ip}</div>
              </div>
              <div className="info-group">
                <label>Software Version</label>
                <div>v{selectedSensor.version}</div>
              </div>
              <div className="info-group">
                <label>Uptime</label>
                <div>{selectedSensor.uptime}</div>
              </div>
            </div>

            <div className="sensor-actions">
              <button className="btn-secondary">
                <Terminal className="w-4 h-4" /> Remote Console
              </button>
              <button className="btn-secondary">
                View Logs
              </button>
              <button className="btn-secondary">
                Configure
              </button>
              <button className="btn-danger ml-auto">
                Restart Sensor
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
