import React from 'react';
import type { RadarNode } from './useRadarNodes';

interface Props {
    node: RadarNode;
    color: string;
}

const RadarTooltip: React.FC<Props> = ({ node, color }) => {
    return (
        <div
            className="absolute bg-[#0a1120]/95 border p-3 rounded shadow-2xl z-50 pointer-events-none font-mono text-[10px]"
            style={{
                left: `${node.x + 20}px`,
                top: `${node.y - 40}px`,
                borderColor: color,
                minWidth: '180px'
            }}
        >
            <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-1">
                <span style={{ color }}>{node.severity.toUpperCase()}</span>
                <span className="text-gray-500">{new Date(node.createdAt).toLocaleTimeString()}</span>
            </div>
            <div className="text-cyan-400 font-bold mb-1 truncate">{node.hostname}</div>
            <div className="text-gray-300">SCORE: <span className="text-white">{node.score}/100</span></div>
            <div className="text-gray-300">ISSUES: <span className="text-white">{node.issues.length}</span></div>
            <div className="mt-2 space-y-0.5">
                {node.issues.slice(0, 3).map((issue, i) => (
                    <div key={i} className="text-gray-400 truncate">• {issue}</div>
                ))}
            </div>
        </div>
    );
};

export default RadarTooltip;