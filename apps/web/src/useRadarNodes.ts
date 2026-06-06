import { useMemo, useState, useEffect } from 'react';
import type { Scan } from './App';

export interface RadarNode {
    id: string;
    hostname: string;
    url: string;
    score: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    issues: string[];
    x: number;
    y: number;
    isNew: boolean;
    createdAt: string;
}

const GOLDEN_ANGLE = 2.399963;
const CENTER_X = 400;
const CENTER_Y = 250;
const MAX_RADIUS = 210;

export const useRadarNodes = (
    scans: Scan[],
    extractHostname: (url: string) => string,
    calculateScore: (s: Scan) => number,
    getSeverity: (s: Scan) => string
) => {
    const [newNodes, setNewNodes] = useState<Set<string>>(new Set());

    const nodes = useMemo(() => {
        // 1. Deduplicação por Hostname (mantém o mais recente)
        const hostMap = new Map<string, Scan>();
        [...scans].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .forEach(scan => hostMap.set(extractHostname(scan.url), scan));

        // 2. Limitar aos 20 alvos mais críticos/recentes para performance
        const latestTargets = Array.from(hostMap.values()).slice(-20);

        return latestTargets.map((scan) => {
            const hostname = extractHostname(scan.url);

            // Gerar hash estável baseado no hostname para posição fixa
            const hash = hostname.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

            // Distribuição espiral (Fermat's Spiral) para evitar sobreposição
            const r = MAX_RADIUS * 0.3 + (hash % 4) * (MAX_RADIUS * 0.2);
            const theta = hash * GOLDEN_ANGLE;

            const severityStr = getSeverity(scan).toLowerCase() as RadarNode['severity'];

            return {
                id: scan.id,
                hostname,
                url: scan.url,
                score: calculateScore(scan),
                severity: severityStr,
                issues: scan.issues || [],
                x: CENTER_X + Math.cos(theta) * r,
                y: CENTER_Y + Math.sin(theta) * r,
                isNew: newNodes.has(scan.id),
                createdAt: scan.createdAt
            };
        });
    }, [scans, newNodes, extractHostname, calculateScore, getSeverity]);

    // Gerenciar estado "isNew" para animação de entrada
    useEffect(() => {
        const lastScan = scans[scans.length - 1];
        if (lastScan && !newNodes.has(lastScan.id)) {
            // Defer the state update to avoid cascading render warnings
            const entryTimer = setTimeout(() => {
                setNewNodes(prev => new Set(prev).add(lastScan.id));
            }, 0);

            const exitTimer = setTimeout(() => {
                setNewNodes(prev => {
                    const next = new Set(prev);
                    next.delete(lastScan.id);
                    return next;
                });
            }, 3000);
            return () => {
                clearTimeout(entryTimer);
                clearTimeout(exitTimer);
            };
        }
    }, [scans, newNodes]);

    return nodes;
};