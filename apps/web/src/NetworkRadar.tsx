import React, { useState } from 'react';
import RadarBackground from './RadarBackground';
import RadarNode from './RadarNode';
import RadarEdge from './RadarEdge';
import RadarTooltip from './RadarTooltip';
import { useRadarNodes } from './useRadarNodes';
import type { Scan } from './App';

const SEVERITY_COLORS = {
    low: '#00ff88',
    medium: '#ffcc00',
    high: '#ff8800',
    critical: '#ff2244',
    unknown: '#8888aa'
} as const;

interface Props {
    scans: Scan[];
    helpers: {
        extractHostname: (url: string) => string;
        calculateScore: (s: Scan) => number;
        getSeverity: (s: Scan) => string;
    }
}

export const NetworkRadar: React.FC<Props> = ({ scans, helpers }) => {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const nodes = useRadarNodes(scans, helpers.extractHostname, helpers.calculateScore, helpers.getSeverity);
    const hoveredNode = nodes.find(n => n.id === hoveredId);

    return (
        <div className="relative w-full h-[320px] bg-[#050a14] rounded-lg border border-white/5 overflow-hidden group">
            {/* Header Overlay */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
                <span className="text-[10px] tracking-[0.2em] text-cyan-500/80 font-bold uppercase">Network Interception Radar</span>
                <div className="flex items-center gap-1.5 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                    <span className="text-[8px] text-cyan-400 font-bold">LIVE</span>
                </div>
            </div>

            {/* Empty State */}
            {nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                    <div className="text-cyan-500/40 text-xs tracking-widest animate-pulse font-mono">
                        INITIALIZING DEFENSE GRID...
                    </div>
                </div>
            )}

            <svg viewBox="0 0 800 500" className="w-full h-full preserve-3d">
                <style>{`
          @keyframes radar-sweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes pulse-low      { 0%{r:18;opacity:0.4} 100%{r:30;opacity:0} }
          @keyframes pulse-medium   { 0%{r:18;opacity:0.5} 100%{r:35;opacity:0} }
          @keyframes pulse-high     { 0%{r:18;opacity:0.6} 100%{r:40;opacity:0} }
          @keyframes pulse-critical { 0%{r:18;opacity:0.8} 100%{r:45;opacity:0} }
          @keyframes node-enter     { 0%{opacity:0;transform:scale(0.3)} 60%{opacity:1;transform:scale(1.2)} 100%{opacity:1;transform:scale(1)} }
          .radar-node { transform-box: fill-box; transform-origin: center; }
        `}</style>

                <defs>
                    {Object.entries(SEVERITY_COLORS).map(([key]) => (
                        <filter id={`glow-${key}`} key={key}>
                            <feGaussianBlur stdDeviation={key === 'critical' ? '6' : '3'} result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    ))}
                </defs>

                <RadarBackground />

                {/* Edges first (render behind nodes) */}
                {nodes.map(node => (
                    <RadarEdge
                        key={`edge-${node.id}`}
                        x2={node.x} y2={node.y}
                        color={SEVERITY_COLORS[node.severity] || SEVERITY_COLORS.unknown}
                        severity={node.severity}
                        score={node.score}
                    />
                ))}

                {/* Nodes */}
                {nodes.map(node => (
                    <RadarNode
                        key={node.id}
                        node={node}
                        isHovered={hoveredId === node.id}
                        onHover={setHoveredId}
                        color={SEVERITY_COLORS[node.severity] || SEVERITY_COLORS.unknown}
                    />
                ))}
            </svg>

            {hoveredNode && (
                <RadarTooltip
                    node={hoveredNode}
                    color={SEVERITY_COLORS[hoveredNode.severity] || SEVERITY_COLORS.unknown}
                />
            )}

            {/* Footer Overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-between text-[8px] text-gray-500 font-mono pointer-events-none">
                <span>{nodes.length} ACTIVE TARGETS TRACED</span>
                <span>GRID_REF: 42-SOC-HYDRA</span>
            </div>
        </div>
    );
};

export default NetworkRadar;