import { useState } from 'react';
import { PlaybookViewer } from '../components/PlaybookViewer';
import { Play, Clock, CheckCircle, AlertTriangle, FileText, ChevronRight } from 'lucide-react';
import { Node, Edge, MarkerType } from '@xyflow/react';

// --- Mock Data ---

const MOCK_PLAYBOOKS = [
  {
    id: 'pb-001',
    title: 'Phishing Response',
    description: 'Automated analysis and remediation of reported phishing emails.',
    lastRun: '10m ago',
    status: 'success',
  },
  {
    id: 'pb-002',
    title: 'Malware Containment',
    description: 'Isolate host and block C2 communication upon malware detection.',
    lastRun: '2h ago',
    status: 'failed',
  },
  {
    id: 'pb-003',
    title: 'Suspicious Login',
    description: 'Investigate impossible travel and password spray attacks.',
    lastRun: '1d ago',
    status: 'success',
  },
];

const PHISHING_NODES: Node[] = [
  { id: '1', type: 'start', data: { label: 'Email Reported' }, position: { x: 0, y: 0 } },
  { id: '2', type: 'action', data: { label: 'Extract Indicators', status: 'success' }, position: { x: 0, y: 0 } },
  { id: '3', type: 'action', data: { label: 'Check Sender Rep', status: 'success' }, position: { x: 0, y: 0 } },
  { id: '4', type: 'condition', data: { label: 'Malicious?' }, position: { x: 0, y: 0 } },
  { id: '5', type: 'action', data: { label: 'Block Sender', status: 'pending' }, position: { x: 0, y: 0 } },
  { id: '6', type: 'action', data: { label: 'Delete Email', status: 'pending' }, position: { x: 0, y: 0 } },
  { id: '7', type: 'action', data: { label: 'Notify User', status: 'success' }, position: { x: 0, y: 0 } },
  { id: '8', type: 'end', data: { label: 'Case Closed' }, position: { x: 0, y: 0 } },
];

const PHISHING_EDGES: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'var(--sev-success)' } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: 'var(--sev-success)' } },
  { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: 'var(--sev-success)' } },
  { id: 'e4-5', source: '4', target: '5', label: 'Yes', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e4-7', source: '4', target: '7', label: 'No', animated: true, style: { stroke: 'var(--sev-success)' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e5-6', source: '5', target: '6', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e6-8', source: '6', target: '8', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e7-8', source: '7', target: '8', animated: true, style: { stroke: 'var(--sev-success)' }, markerEnd: { type: MarkerType.ArrowClosed } },
];

export default function Playbooks() {
  const [selectedPlaybook, setSelectedPlaybook] = useState(MOCK_PLAYBOOKS[0]);

  return (
    <div className="h-full flex gap-6">
      {/* Sidebar List */}
      <div className="w-80 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Playbooks</h1>
          <button className="p-2 bg-[var(--sev-info)] text-white rounded hover:opacity-90">
            <Play className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto">
          {MOCK_PLAYBOOKS.map((pb) => (
            <button
              key={pb.id}
              onClick={() => setSelectedPlaybook(pb)}
              className={`p-4 rounded border text-left transition-all ${
                selectedPlaybook.id === pb.id
                  ? 'bg-[var(--bg-hover)] border-[var(--sev-info)] shadow-sm'
                  : 'bg-[var(--bg-panel)] border-[var(--border-subtle)] hover:border-[var(--text-secondary)]'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-[var(--text-primary)]">{pb.title}</h3>
                {pb.status === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-[var(--sev-low)]" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-[var(--sev-critical)]" />
                )}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-3 line-clamp-2">
                {pb.description}
              </p>
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <Clock className="w-3 h-3" />
                <span>Last run: {pb.lastRun}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Flowchart */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="bg-[var(--bg-panel)] p-4 border border-[var(--border-subtle)] rounded flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              {selectedPlaybook.title}
              <span className="px-2 py-0.5 rounded-full bg-[var(--bg-hover)] text-xs font-normal text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                v1.2.0
              </span>
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {selectedPlaybook.description}
            </p>
          </div>
          <div className="flex gap-2">
             <button className="px-4 py-2 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2">
               <FileText className="w-4 h-4" />
               View Logs
             </button>
             <button 
               onClick={handleRunPlaybook}
               className="px-4 py-2 bg-[var(--sev-info)] text-white rounded text-sm hover:opacity-90 flex items-center gap-2"
             >
               <Play className="w-4 h-4" />
               Run Now
             </button>
          </div>
        </div>

        <PlaybookViewer 
          key={selectedPlaybook.id} // Force re-render on switch
          initialNodes={PHISHING_NODES} 
          initialEdges={PHISHING_EDGES} 
        />
      </div>
    </div>
  );
}
