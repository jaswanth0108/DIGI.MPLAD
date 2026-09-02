import React from 'react';

interface BreakdownProps {
  scores: {
    financial?: number;
    delay?: number;
    expenditure?: number;
    duplicate?: number;
    peer_deviation?: number;
    ml_anomaly?: number;
  };
}

const METRICS = [
  { key: 'financial', label: 'Financial Cost Overrun', weight: '25%', color: '#ef4444' },
  { key: 'delay', label: 'Project Delay / Stalled', weight: '20%', color: '#f97316' },
  { key: 'expenditure', label: 'Expenditure Velocity', weight: '20%', color: '#f59e0b' },
  { key: 'duplicate', label: 'Duplicate / Similarity', weight: '15%', color: '#8b5cf6' },
  { key: 'peer_deviation', label: 'Peer & District Deviation', weight: '10%', color: '#3b82f6' },
  { key: 'ml_anomaly', label: 'Isolation Forest ML Outlier', weight: '10%', color: '#14b8a6' },
];

export const ScoreBreakdown: React.FC<BreakdownProps> = ({ scores }) => {
  return (
    <div className="score-breakdown">
      {METRICS.map((m) => {
        const val = Math.round(Number(scores[m.key as keyof typeof scores] || 0));
        return (
          <div key={m.key} className="score-row">
            <div className="score-row-label" title={`Weight: ${m.weight}`}>
              {m.label}
            </div>
            <div className="score-bar-track">
              <div
                className="score-bar-fill"
                style={{
                  width: `${val}%`,
                  backgroundColor: m.color,
                }}
              />
            </div>
            <div className="score-row-value" style={{ color: m.color }}>
              {val}
            </div>
          </div>
        );
      })}
    </div>
  );
};
