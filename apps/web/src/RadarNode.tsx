import React from 'react';
import type { RadarNode as RadarNodeProps } from './useRadarNodes';

interface Props {
    node: RadarNodeProps;
    isHovered: boolean;
    onHover: (id: string | null) => void;
    color: string;
}

const RadarNode: React.FC<Props> = ({ node, isHovered, onHover, color }) => {
    const pulseClass = `pulse-${node.severity}`;
    const enterClass = node.isNew ? 'node-enter' : '';

    return (
        <g
            className={`radar-node cursor-pointer ${enterClass}`}
            onMouseEnter={() => onHover(node.id)}
            onMouseLeave={() => onHover(null)}
            style={{ transition: 'all 0.3s ease' }}
        >
            {/* Anel de Pulsação Externo */}
            <circle
                cx={node.x} cy={node.y} r={18}
                fill="none" stroke={color} strokeWidth="1"
                style={{ animation: `${pulseClass} var(--pulse-duration, 2s) infinite` }}
            />

            {/* Glow e Círculo Base */}
            <circle
                cx={node.x} cy={node.y} r={14}
                fill={color} fillOpacity="0.15"
                stroke={color} strokeWidth={isHovered ? 2.5 : 1.5}
                filter={`url(#glow-${node.severity})`}
            />

            {/* Score */}
            <text
                x={node.x} y={node.y + 4}
                textAnchor="middle"
                fill={color} fontSize="9" fontWeight="bold"
                style={{ pointerEvents: 'none' }}
            >
                {node.score}
            </text>

            {/* Hostname Label */}
            <text
                x={node.x} y={node.y + 26}
                textAnchor="middle"
                fill="#8899aa" fontSize="8"
                style={{ pointerEvents: 'none', opacity: isHovered ? 1 : 0.7 }}
            >
                {node.hostname.length > 15
                    ? `${node.hostname.substring(0, 12)}...`
                    : node.hostname
                }
            </text>
        </g>
    );
};

export default React.memo(RadarNode);