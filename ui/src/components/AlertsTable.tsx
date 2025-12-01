import { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Activity, Play } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
};

interface Alert {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  timestamp: string;
  description: string;
  tenant_id: string;
  sensor?: { id: string };
  events?: { sensor?: { id: string } }[];
}

const AlertsTable = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [requestingPcap, setRequestingPcap] = useState<string | null>(null);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await axios.get('http://localhost:8081/alerts');
      setAlerts(response.data.alerts || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPcap = async (alert: Alert) => {
    const sensorId = alert.sensor?.id || alert.events?.[0]?.sensor?.id || 'sensor-001';
    setRequestingPcap(alert.id);
    try {
      await axios.post(`http://localhost:8084/sensors/${sensorId}/pcap`, {
        duration_seconds: 60,
        object_key: `pcap/manual/${alert.id}_${Date.now()}.pcap`,
        notes: `Manual request for alert ${alert.id}`
      });
      window.alert('PCAP request started successfully');
    } catch (error) {
      console.error('Failed to request PCAP:', error);
      window.alert('Failed to request PCAP');
    } finally {
      setRequestingPcap(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading alerts...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          Security Alerts
        </h2>
        <span className="text-sm text-gray-500">{alerts.length} active alerts</span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {alerts.map((alert) => (
              <tr key={alert.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={clsx(
                    'px-2 py-1 text-xs font-medium rounded-full border',
                    SEVERITY_COLORS[alert.severity] || 'bg-gray-100 text-gray-800'
                  )}>
                    {alert.severity.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(alert.timestamp), 'MMM d, HH:mm:ss')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{alert.title}</div>
                  <div className="text-sm text-gray-500">{alert.description}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {alert.tenant_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleRequestPcap(alert)}
                    disabled={requestingPcap === alert.id}
                    className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1 ml-auto disabled:opacity-50"
                  >
                    {requestingPcap === alert.id ? (
                      <Activity className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    Request PCAP
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AlertsTable;
