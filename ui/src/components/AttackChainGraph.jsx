import { useEffect, useRef, useState } from 'react';
import { Shield, AlertTriangle, Globe, Server, FileText } from 'lucide-react';
import './AttackChainGraph.css';

export default function AttackChainGraph({ chain }) {
  const svgRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);

  useEffect(() => {
    if (!chain || chain.length === 0) return;

    // Simple layout: Horizontal timeline
    // In a real graph, we'd use d3-force or dagre
    const width = 600;
    const height = 300;
    const padding = 50;
    const nodeSpacing = (width - padding * 2) / (chain.length > 1 ? chain.length - 1 : 1);

    const newNodes = chain.map((alert, index) => ({
      ...alert,
      x: padding + index * nodeSpacing,
      y: height / 2 + (index % 2 === 0 ? -20 : 20), // Stagger slightly
      type: getAlertType(alert)
    }));

    const newLinks = newNodes.slice(0, -1).map((node, index) => ({
      source: node,
      target: newNodes[index + 1]
    }));

    setNodes(newNodes);
    setLinks(newLinks);

  }, [chain]);

  const getAlertType = (alert) => {
    if (alert.src_ip && alert.dst_ip) return 'network';
    if (alert.rule_name?.toLowerCase().includes('file')) return 'file';
    return 'generic';
  };

  const getNodeIcon = (type) => {
    switch (type) {
      case 'network': return <Globe className="w-4 h-4" />;
      case 'file': return <FileText className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#10b981';
      default: return '#94a3b8';
    }
  };

  return (
    <div className="attack-chain-graph">
      <svg ref={svgRef} width="100%" height="300" viewBox="0 0 600 300">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="28"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
          </marker>
        </defs>

        {/* Links */}
        {links.map((link, i) => (
          <line
            key={i}
            x1={link.source.x}
            y1={link.source.y}
            x2={link.target.x}
            y2={link.target.y}
            stroke="#475569"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
            strokeDasharray="4"
          />
        ))}

        {/* Nodes */}
        {nodes.map((node, i) => (
          <g key={i} transform={`translate(${node.x}, ${node.y})`}>
            {/* Pulse effect for critical nodes */}
            {node.severity === 'critical' && (
              <circle r="25" fill={getSeverityColor(node.severity)} opacity="0.2">
                <animate attributeName="r" from="20" to="30" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.3" to="0" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
            
            <circle
              r="20"
              fill="#1e293b"
              stroke={getSeverityColor(node.severity)}
              strokeWidth="2"
              className="node-circle"
            />
            
            <foreignObject x="-10" y="-10" width="20" height="20">
              <div className="node-icon" style={{ color: getSeverityColor(node.severity) }}>
                {getNodeIcon(node.type)}
              </div>
            </foreignObject>

            {/* Labels */}
            <text
              y="35"
              textAnchor="middle"
              fill="#e2e8f0"
              fontSize="12"
              fontWeight="500"
            >
              {node.title || node.rule_name}
            </text>
            <text
              y="50"
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="10"
            >
              {new Date(node.timestamp).toLocaleTimeString()}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
