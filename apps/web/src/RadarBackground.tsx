import React from 'react';

const RadarBackground: React.FC = () => {
    return (
        <g className="radar-infrastructure">
            {/* Grid de Pontos */}
            {Array.from({ length: 13 }).map((_, i) =>
                Array.from({ length: 8 }).map((_, j) => (
                    <circle key={`${i}-${j}`} cx={i * 65} cy={j * 65} r={1} fill="#1e3a5f" opacity="0.3" />
                ))
            )}

            {/* Círculos Concêntricos */}
            <circle cx="400" cy="250" r="75" fill="none" stroke="#1e3a5f" strokeWidth="1" opacity="0.4" />
            <circle cx="400" cy="250" r="150" fill="none" stroke="#1e3a5f" strokeWidth="1" opacity="0.3" />
            <circle cx="400" cy="250" r="225" fill="none" stroke="#1e3a5f" strokeWidth="1" opacity="0.2" />

            {/* Centro Hydra */}
            <text x="400" y="240" textAnchor="middle" fill="#00ffff" fontSize="10" opacity="0.5" letterSpacing="2">HYDRA</text>
            <circle cx="400" cy="250" r="4" fill="#00ffff" />

            {/* Radar Sweep (Linha Giratória) */}
            <g style={{ transformOrigin: '400px 250px', animation: 'radar-sweep 4s linear infinite' }}>
                {/* Rastro do Sweep */}
                <path
                    d="M 400 250 L 400 25 A 225 225 0 0 0 250 85 L 400 250"
                    fill="url(#sweepGradient)"
                    opacity="0.4"
                />
                <line x1="400" y1="250" x2="400" y2="25" stroke="#00ffff" strokeWidth="1.5" opacity="0.8" />
            </g>

            <defs>
                <linearGradient id="sweepGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="transparent" />
                    <stop offset="100%" stopColor="#00ffff" />
                </linearGradient>
            </defs>
        </g>
    );
};

export default React.memo(RadarBackground);