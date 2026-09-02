import React from 'react';

interface Props {
  band?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | string;
  score?: number;
}

export const RiskBadge: React.FC<Props> = ({ band, score }) => {
  const normalizedBand = (band || 'LOW').toUpperCase();
  const classKey = normalizedBand.toLowerCase();

  return (
    <span className={`risk-badge ${classKey}`}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: 'currentColor',
          display: 'inline-block',
        }}
      />
      {normalizedBand} {score !== undefined ? `(${Math.round(score)})` : ''}
    </span>
  );
};
