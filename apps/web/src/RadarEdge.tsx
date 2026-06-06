import React from 'react';

interface Props {
    x2: number;
    y2: number;
    color: string;
    severity: string;
    score: number;
}

const RadarEdge: React.FC<Props> = ({ x2, y2, color, severity, score }) => {
    const isHigh = severity === 'high' || severity === 'critical';

    return (
        <line
            x1="400" y1="250" x2={x2} y2={y2}
            stroke={color}
            strokeWidth={isHigh ? 2 : 1}
            strokeOpacity={(score / 100) * 0.4}
            strokeDasharray={isHigh ? "0" : "4 4"}
        />
    );
};

export default React.memo(RadarEdge);