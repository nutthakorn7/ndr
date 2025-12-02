import { useMemo } from 'react';
import type { DetectionRule } from '../utils/mockRules';
import './MitreHeatMap.css';

interface MitreHeatMapProps {
  rules: DetectionRule[];
  onTacticClick?: (tacticId: string) => void;
  onTechniqueClick?: (techniqueId: string) => void;
}

// MITRE ATT&CK Tactics
const MITRE_TACTICS = [
  { id: 'TA0043', name: 'Reconnaissance', short: 'Recon' },
  { id: 'TA0042', name: 'Resource Development', short: 'Resource Dev' },
  { id: 'TA0001', name: 'Initial Access', short: 'Initial Access' },
  { id: 'TA0002', name: 'Execution', short: 'Execution' },
  { id: 'TA0003', name: 'Persistence', short: 'Persistence' },
  { id: 'TA0004', name: 'Privilege Escalation', short: 'Priv Esc' },
  { id: 'TA0005', name: 'Defense Evasion', short: 'Defense Evasion' },
  { id: 'TA0006', name: 'Credential Access', short: 'Cred Access' },
  { id: 'TA0007', name: 'Discovery', short: 'Discovery' },
  { id: 'TA0008', name: 'Lateral Movement', short: 'Lateral Move' },
  { id: 'TA0009', name: 'Collection', short: 'Collection' },
  { id: 'TA0011', name: 'Command and Control', short: 'C2' },
  { id: 'TA0010', name: 'Exfiltration', short: 'Exfiltration' },
  { id: 'TA0040', name: 'Impact', short: 'Impact' }
];

export default function MitreHeatMap({ rules, onTacticClick, onTechniqueClick }: MitreHeatMapProps) {
  // Calculate coverage per tactic
  const tacticCoverage = useMemo(() => {
    const coverage: Record<string, { count: number; techniques: Set<string> }> = {};
    
    // Initialize
    MITRE_TACTICS.forEach(tactic => {
      coverage[tactic.id] = { count: 0, techniques: new Set() };
    });
    
    // Count rules per tactic
    rules.forEach(rule => {
      rule.mitreTactics.forEach(tacticId => {
        if (coverage[tacticId]) {
          coverage[tacticId].count++;
          rule.mitreTechniques.forEach(tech => {
            coverage[tacticId].techniques.add(tech);
          });
        }
      });
    });
    
    return coverage;
  }, [rules]);

  // Calculate total coverage
  const totalStats = useMemo(() => {
    const totalRules = rules.length;
    const rulesWithMitre = rules.filter(r => r.mitreTactics.length > 0).length;
    const uniqueTechniques = new Set<string>();
    
    rules.forEach(rule => {
      rule.mitreTechniques.forEach(tech => uniqueTechniques.add(tech));
    });
    
    const coveragePercent = totalRules > 0 ? Math.round((rulesWithMitre / totalRules) * 100) : 0;
    
    return {
      totalRules,
      rulesWithMitre,
      uniqueTechniques: uniqueTechniques.size,
      coveragePercent
    };
  }, [rules]);

  // Get color based on coverage count
  const getCoverageColor = (count: number): string => {
    if (count === 0) return '#1e293b'; // No coverage - dark
    if (count < 50) return '#7f1d1d'; // Low coverage - dark red
    if (count < 150) return '#dc2626'; // Medium-low - red
    if (count < 300) return '#f97316'; // Medium - orange
    if (count < 500) return '#eab308'; // Medium-high - yellow
    return '#22c55e'; // High coverage - green
  };

  const getCoverageLevel = (count: number): string => {
    if (count === 0) return 'None';
    if (count < 50) return 'Low';
    if (count < 150) return 'Medium-Low';
    if (count < 300) return 'Medium';
    if (count < 500) return 'Medium-High';
    return 'High';
  };

  return (
    <div className="mitre-heatmap">
      {/* Header Stats */}
      <div className="mitre-stats">
        <div className="mitre-stat-card">
          <div className="stat-label">Total Rules with MITRE</div>
          <div className="stat-value">{totalStats.rulesWithMitre.toLocaleString()}</div>
          <div className="stat-sublabel">{totalStats.coveragePercent}% of all rules</div>
        </div>
        <div className="mitre-stat-card">
          <div className="stat-label">Unique Techniques Covered</div>
          <div className="stat-value">{totalStats.uniqueTechniques}</div>
          <div className="stat-sublabel">Across all tactics</div>
        </div>
        <div className="mitre-stat-card">
          <div className="stat-label">Tactics Covered</div>
          <div className="stat-value">
            {Object.values(tacticCoverage).filter(t => t.count > 0).length}
          </div>
          <div className="stat-sublabel">out of 14 tactics</div>
        </div>
      </div>

      {/* Coverage Legend */}
      <div className="coverage-legend">
        <span className="legend-title">Coverage Level:</span>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#1e293b' }}></div>
            <span>None (0)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#7f1d1d' }}></div>
            <span>Low (1-49)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#dc2626' }}></div>
            <span>Med-Low (50-149)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#f97316' }}></div>
            <span>Medium (150-299)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#eab308' }}></div>
            <span>Med-High (300-499)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#22c55e' }}></div>
            <span>High (500+)</span>
          </div>
        </div>
      </div>

      {/* Heat Map Grid */}
      <div className="mitre-grid">
        <div className="grid-header">
          <h3>MITRE ATT&CK Tactics Coverage</h3>
          <p>Click on a tactic to filter rules</p>
        </div>
        
        <div className="tactics-grid">
          {MITRE_TACTICS.map(tactic => {
            const coverage = tacticCoverage[tactic.id];
            const color = getCoverageColor(coverage.count);
            const level = getCoverageLevel(coverage.count);
            
            return (
              <div
                key={tactic.id}
                className="tactic-cell"
                style={{ backgroundColor: color }}
                onClick={() => onTacticClick?.(tactic.id)}
                title={`${tactic.name}\n${coverage.count} rules\n${coverage.techniques.size} unique techniques\nCoverage: ${level}`}
              >
                <div className="tactic-name">{tactic.short}</div>
                <div className="tactic-id">{tactic.id}</div>
                <div className="tactic-count">{coverage.count} rules</div>
                <div className="tactic-techniques">{coverage.techniques.size} techniques</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Coverage Details */}
      <div className="coverage-details">
        <h4>Top Covered Tactics</h4>
        <div className="top-tactics">
          {Object.entries(tacticCoverage)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 5)
            .map(([tacticId, data]) => {
              const tactic = MITRE_TACTICS.find(t => t.id === tacticId);
              if (!tactic) return null;
              
              return (
                <div key={tacticId} className="tactic-row" onClick={() => onTacticClick?.(tacticId)}>
                  <div className="tactic-info">
                    <span className="tactic-badge">{tactic.id}</span>
                    <span className="tactic-name-full">{tactic.name}</span>
                  </div>
                  <div className="tactic-stats">
                    <span className="rule-count">{data.count} rules</span>
                    <span className="tech-count">{data.techniques.size} techniques</span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Gap Analysis */}
      <div className="gap-analysis">
        <h4>Coverage Gaps</h4>
        <div className="gap-list">
          {MITRE_TACTICS.filter(tactic => tacticCoverage[tactic.id].count === 0).length > 0 ? (
            MITRE_TACTICS.filter(tactic => tacticCoverage[tactic.id].count === 0).map(tactic => (
              <div key={tactic.id} className="gap-item">
                <span className="gap-badge">{tactic.id}</span>
                <span className="gap-name">{tactic.name}</span>
                <span className="gap-warning">⚠️ No Coverage</span>
              </div>
            ))
          ) : (
            <div className="no-gaps">✅ All tactics have coverage!</div>
          )}
        </div>
      </div>
    </div>
  );
}
