import React from 'react';

interface Props {
  score: number;
  size?: number;
  showLabel?: boolean;
}

export const RiskGauge: React.FC<Props> = ({ score = 0, size = 120, showLabel = true }) => {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  const radius = size * 0.38;
  const strokeWidth = size * 0.08;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;

  let strokeColor = 'var(--risk-low)';
  if (safeScore >= 75) strokeColor = 'var(--risk-critical)';
  else if (safeScore >= 50) strokeColor = 'var(--risk-high)';
  else if (safeScore >= 25) strokeColor = 'var(--risk-moderate)';

  return (
    <div className="risk-gauge">
      <div className="risk-gauge-ring" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`}>
          <circle
            className="bg"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
          <circle
            className="fill"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="risk-gauge-value" style={{ color: strokeColor }}>
          {safeScore}
        </div>
      </div>
      {showLabel && (
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          OUT OF 100
        </span>
      )}
    </div>
  );
};
