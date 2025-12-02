export interface IncidentTimelineItem {
  id: string;
  type: 'status_change' | 'comment' | 'alert_linked' | 'artifact_added';
  user: string;
  timestamp: string;
  content: string;
  metadata?: any;
}

export interface Incident {
  id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'New' | 'Investigating' | 'Resolved' | 'False Positive';
  assignee: string | null;
  created_at: string;
  updated_at: string;
  description: string;
  affected_assets: string[];
  related_alerts: number;
  tags: string[];
  timeline: IncidentTimelineItem[];
}

export const mockIncidents: Incident[] = [
  {
    id: 'INC-2023-001',
    title: 'Potential Data Exfiltration to Unknown IP',
    severity: 'Critical',
    status: 'Investigating',
    assignee: 'Alex D.',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    updated_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    description: 'Large volume of encrypted traffic detected leaving the Finance subnet towards an uncategorized external IP address (45.33.22.11). Pattern matches known C2 beaconing behavior.',
    affected_assets: ['10.0.3.15 (Finance-DB)', '10.0.3.1 (Gateway)'],
    related_alerts: 12,
    tags: ['Exfiltration', 'C2', 'Finance'],
    timeline: [
      {
        id: 't1',
        type: 'status_change',
        user: 'System',
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        content: 'Incident created from Alert #4421'
      },
      {
        id: 't2',
        type: 'status_change',
        user: 'Alex D.',
        timestamp: new Date(Date.now() - 86400000 * 1.8).toISOString(),
        content: 'Status changed to Investigating'
      },
      {
        id: 't3',
        type: 'comment',
        user: 'Alex D.',
        timestamp: new Date(Date.now() - 86400000 * 1.5).toISOString(),
        content: 'Initial analysis confirms traffic is non-standard SSL. IP reputation check is inconclusive but suspicious.'
      },
      {
        id: 't4',
        type: 'comment',
        user: 'Sarah J.',
        timestamp: new Date(Date.now() - 86400000 * 0.5).toISOString(),
        content: 'I saw similar traffic patterns last week on the Engineering subnet. Might be related.'
      }
    ]
  },
  {
    id: 'INC-2023-002',
    title: 'Ransomware Behavior Detected on Workstation',
    severity: 'High',
    status: 'New',
    assignee: null,
    created_at: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
    updated_at: new Date(Date.now() - 14400000).toISOString(),
    description: 'Rapid file encryption activities detected on endpoint pc-042. High IOPS and modification of file extensions to .enc.',
    affected_assets: ['pc-042', 'file-share-01'],
    related_alerts: 5,
    tags: ['Ransomware', 'Endpoint', 'Urgent'],
    timeline: [
      {
        id: 't1',
        type: 'status_change',
        user: 'System',
        timestamp: new Date(Date.now() - 14400000).toISOString(),
        content: 'Incident created from Alert #5502'
      }
    ]
  },
  {
    id: 'INC-2023-003',
    title: 'Suspicious PowerShell Execution',
    severity: 'Medium',
    status: 'Resolved',
    assignee: 'Mike R.',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    description: 'Encoded PowerShell command executed on Web Server. Determined to be part of scheduled maintenance script but flagged due to encoding.',
    affected_assets: ['web-server-01'],
    related_alerts: 1,
    tags: ['PowerShell', 'False Positive'],
    timeline: [
      {
        id: 't1',
        type: 'status_change',
        user: 'System',
        timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
        content: 'Incident created'
      },
      {
        id: 't2',
        type: 'comment',
        user: 'Mike R.',
        timestamp: new Date(Date.now() - 86400000 * 4.5).toISOString(),
        content: 'Checked with DevOps team. This is the weekly backup script.'
      },
      {
        id: 't3',
        type: 'status_change',
        user: 'Mike R.',
        timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
        content: 'Status changed to Resolved'
      }
    ]
  },
  {
    id: 'INC-2023-004',
    title: 'Brute Force Attempt via SSH',
    severity: 'Low',
    status: 'New',
    assignee: null,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    description: 'Multiple failed login attempts (200+) from external IP 192.168.1.50 against SSH service.',
    affected_assets: ['bastion-host'],
    related_alerts: 1,
    tags: ['Brute Force', 'SSH'],
    timeline: [
      {
        id: 't1',
        type: 'status_change',
        user: 'System',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        content: 'Incident created'
      }
    ]
  }
];
