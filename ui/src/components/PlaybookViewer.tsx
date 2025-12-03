import { useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Position,
  Handle,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

// --- Custom Node Types ---

const BaseNode = ({ data, style, handleStyle }: any) => (
  <div className={`px-4 py-2 shadow-md rounded-md border-2 min-w-[150px] text-center font-medium text-sm bg-[var(--bg-panel)] text-[var(--text-primary)] ${style}`}>
    <Handle type="target" position={Position.Top} className="!bg-[var(--text-secondary)]" />
    <div className="flex flex-col gap-1">
      <div>{data.label}</div>
      {data.status && (
        <div className={`text-[10px] uppercase tracking-wider ${
          data.status === 'success' ? 'text-[var(--sev-low)]' :
          data.status === 'failed' ? 'text-[var(--sev-critical)]' :
          data.status === 'running' ? 'text-[var(--sev-info)]' : 'text-[var(--text-secondary)]'
        }`}>
          {data.status}
        </div>
      )}
    </div>
    <Handle type="source" position={Position.Bottom} className="!bg-[var(--text-secondary)]" />
  </div>
);

const StartNode = ({ data }: any) => (
  <BaseNode data={data} style="border-[var(--sev-info)] rounded-full" />
);

const ActionNode = ({ data }: any) => (
  <BaseNode data={data} style={`border-[var(--border-subtle)] ${
    data.status === 'running' ? 'animate-pulse border-[var(--sev-info)]' : ''
  }`} />
);

const ConditionNode = ({ data }: any) => (
  <div className="relative flex items-center justify-center w-24 h-24">
     <div className="absolute inset-0 transform rotate-45 bg-[var(--bg-panel)] border-2 border-[var(--sev-medium)] shadow-md flex items-center justify-center">
     </div>
     <div className="relative z-10 text-center text-xs font-medium text-[var(--text-primary)] p-2">
       {data.label}
     </div>
     <Handle type="target" position={Position.Top} className="!bg-[var(--text-secondary)] -mt-3" />
     <Handle type="source" position={Position.Bottom} className="!bg-[var(--text-secondary)] -mb-3" />
     {/* Logic for branching usually handled by multiple source handles or edge labels, simplifying for visualizer */}
  </div>
);

const EndNode = ({ data }: any) => (
  <BaseNode data={data} style="border-[var(--text-secondary)] bg-[var(--bg-hover)] rounded-full opacity-80" />
);

const nodeTypes = {
  start: StartNode,
  action: ActionNode,
  condition: ConditionNode,
  end: EndNode,
};

// --- Layout Helper ---
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 150, height: 50 }); // Approx dimensions
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - 75, // Center offset
        y: nodeWithPosition.y - 25,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// --- Component ---

interface PlaybookViewerProps {
  initialNodes: Node[];
  initialEdges: Edge[];
}

export function PlaybookViewer({ initialNodes, initialEdges }: PlaybookViewerProps) {
  const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
    initialNodes,
    initialEdges
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div className="h-full w-full bg-[var(--bg-app)] rounded-lg border border-[var(--border-subtle)] overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
      >
        <Controls className="!bg-[var(--bg-panel)] !border-[var(--border-subtle)] [&>button]:!border-b-[var(--border-subtle)] [&>button]:!fill-[var(--text-secondary)] hover:[&>button]:!bg-[var(--bg-hover)]" />
        <MiniMap 
          className="!bg-[var(--bg-panel)] !border-[var(--border-subtle)]" 
          nodeColor={(n) => {
            if (n.type === 'start') return 'var(--sev-info)';
            if (n.type === 'condition') return 'var(--sev-medium)';
            if (n.type === 'end') return 'var(--text-secondary)';
            return 'var(--bg-hover)';
          }}
        />
        <Background color="var(--border-subtle)" gap={16} />
      </ReactFlow>
    </div>
  );
}
