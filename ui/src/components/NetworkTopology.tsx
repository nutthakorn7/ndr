import { useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { generateTopologyData, TopologyNode, TopologyLink } from '../utils/mockTopology';
import { X, ZoomIn, ZoomOut, RefreshCw, Activity, Shield, AlertTriangle } from 'lucide-react';
import './NetworkTopology.css';

export default function NetworkTopology() {
  const [data, setData] = useState<{ nodes: TopologyNode[], links: TopologyLink[] }>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);

  useEffect(() => {
    // Initial data generation
    setData(generateTopologyData());

    // Handle resize
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNodeClick = useCallback((node: TopologyNode) => {
    setSelectedNode(node);
    
    // Center view on node
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 1000);
      fgRef.current.zoom(2, 2000);
    }
  }, []);

  const handleZoomIn = () => {
    if (fgRef.current) {
      fgRef.current.zoom(fgRef.current.zoom() * 1.2, 400);
    }
  };

  const handleZoomOut = () => {
    if (fgRef.current) {
      fgRef.current.zoom(fgRef.current.zoom() / 1.2, 400);
    }
  };

  const handleReset = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400);
    }
    setSelectedNode(null);
  };

  // Custom node rendering
  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name;
    const fontSize = 12 / globalScale;
    
    // Draw circle
    ctx.beginPath();
    const r = node.val;
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
    
    // Color based on status
    if (node.status === 'compromised') ctx.fillStyle = '#ef4444';
    else if (node.status === 'suspicious') ctx.fillStyle = '#f59e0b';
    else if (node.type === 'firewall') ctx.fillStyle = '#3b82f6';
    else if (node.type === 'router') ctx.fillStyle = '#8b5cf6';
    else if (node.type === 'server') ctx.fillStyle = '#10b981';
    else ctx.fillStyle = '#64748b';
    
    ctx.fill();
    
    // Draw border if selected
    if (selectedNode && selectedNode.id === node.id) {
      ctx.lineWidth = 2 / globalScale;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
    }

    // Draw label
    if (globalScale > 1.5 || (selectedNode && selectedNode.id === node.id)) {
      ctx.font = `${fontSize}px Sans-Serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(label, node.x, node.y + r + fontSize);
    }
  }, [selectedNode]);

  return (
    <div className="topology-container" ref={containerRef}>
      <div className="topology-controls">
        <button className="btn-icon-sm" onClick={handleZoomIn} title="Zoom In">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button className="btn-icon-sm" onClick={handleZoomOut} title="Zoom Out">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button className="btn-icon-sm" onClick={handleReset} title="Reset View">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="topology-legend">
        <div className="legend-item">
          <div className="legend-dot" style={{ background: '#ef4444' }}></div>
          <span>Compromised</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: '#f59e0b' }}></div>
          <span>Suspicious</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: '#22c55e' }}></div>
          <span>Safe</span>
        </div>
      </div>

      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={data}
        nodeLabel="name"
        nodeColor={(node: any) => {
          if (node.status === 'compromised') return '#ef4444';
          if (node.status === 'suspicious') return '#f59e0b';
          return '#64748b';
        }}
        nodeCanvasObject={paintNode}
        linkColor={() => '#334155'}
        linkWidth={1}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={d => (d as any).active ? 0.005 : 0}
        linkDirectionalParticleWidth={2}
        onNodeClick={handleNodeClick}
        backgroundColor="#0f172a"
        cooldownTicks={100}
      />

      {selectedNode && (
        <div className="topology-details">
          <div className="details-header">
            <div className="details-title">
              <h3>{selectedNode.name}</h3>
              <div className="details-subtitle">{selectedNode.type.toUpperCase()}</div>
            </div>
            <button className="details-close" onClick={() => setSelectedNode(null)}>
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="details-content">
            <div className="detail-row">
              <span className="detail-label">Status</span>
              <span className={`status-badge ${selectedNode.status}`}>
                {selectedNode.status}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">IP Address</span>
              <span className="detail-value">{selectedNode.ip}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">MAC Address</span>
              <span className="detail-value">{selectedNode.details?.mac}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">OS</span>
              <span className="detail-value">{selectedNode.details?.os}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Open Ports</span>
              <span className="detail-value">
                {selectedNode.details?.openPorts.join(', ') || 'None'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Last Seen</span>
              <span className="detail-value">{selectedNode.details?.lastSeen}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
