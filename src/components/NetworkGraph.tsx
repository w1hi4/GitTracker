import React, { useEffect, useRef, useState, useMemo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import ForceGraph2D from 'react-force-graph-2d';
import { RepoData } from '../lib/api';
import { Box, Maximize2, RotateCcw, Zap, ZapOff, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export function NetworkGraph({ data, onNodeClick }: { data: RepoData, onNodeClick?: (node: any) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [is3D, setIs3D] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(false);
    const timer = setTimeout(() => setIsReady(true), 500);
    return () => clearTimeout(timer);
  }, [data, is3D]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const graphData = useMemo(() => {
    const nodes: any[] = [];
    const links: any[] = [];
    const nodeIds = new Set<string>();

    if (!data.recentCommits || data.recentCommits.length === 0) {
      return { nodes: [], links: [] };
    }

    // We only use recentCommits to build the core graph to ensure connectivity
    data.recentCommits.forEach(c => {
      // Add commit node
      if (!nodeIds.has(c.sha)) {
        nodes.push({ id: c.sha, group: 'commit', name: c.message.substring(0, 50), val: 3 });
        nodeIds.add(c.sha);
      }
      
      // Add author node
      if (!nodeIds.has(c.authorName)) {
        nodes.push({ id: c.authorName, group: 'author', name: c.authorName, val: 6 });
        nodeIds.add(c.authorName);
      }
      
      // Link author to commit
      links.push({ source: c.authorName, target: c.sha, type: 'author-commit' });

      // Link commit to parents
      c.parents.forEach(pSha => {
        if (!nodeIds.has(pSha)) {
          nodes.push({ id: pSha, group: 'commit_parent', name: 'Older Commit', val: 1 });
          nodeIds.add(pSha);
        }
        links.push({ source: c.sha, target: pSha, type: 'parent-commit' });
      });
    });

    // Add branches
    data.branches.forEach(b => {
      if (!nodeIds.has(b.name)) {
        nodes.push({ id: b.name, group: 'branch', name: b.name, val: 5 });
        nodeIds.add(b.name);
      }
      if (nodeIds.has(b.commitSha)) {
        links.push({ source: b.name, target: b.commitSha, type: 'branch-head' });
      }
    });

    return { nodes, links };
  }, [data]);

  const isEmpty = graphData.nodes.length === 0;

  const forcesSet = useRef(false);

  useEffect(() => {
    forcesSet.current = false;
  }, [data.stats.url, is3D]);

  const handleEngineTick = () => {
    if (!forcesSet.current && fgRef.current && typeof fgRef.current.d3Force === 'function') {
      try {
        const chargeForce = fgRef.current.d3Force('charge');
        const linkForce = fgRef.current.d3Force('link');
        
        if (chargeForce && linkForce) {
          chargeForce.strength(is3D ? -60 : -100);
          linkForce.distance(is3D ? 40 : 50);
          forcesSet.current = true;
        }
      } catch (err) {
        // Silently ignore errors during early initialization ticks
      }
    }
  };

  const handleReset = () => {
    if (fgRef.current) {
      if (is3D) {
        fgRef.current.cameraPosition({ x: 0, y: 0, z: 200 }, { x: 0, y: 0, z: 0 }, 1000);
      } else {
        fgRef.current.zoomToFit(1000);
      }
    }
  };

  return (
    <div ref={containerRef} className="w-full h-[600px] rounded-3xl overflow-hidden glass-panel relative group border border-white/5">
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      {/* Legend & Controls */}
      <div className="absolute top-6 left-6 z-20 flex flex-col gap-4 pointer-events-none">
        <div className="bg-[#030305]/80 p-5 rounded-2xl backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] pointer-events-auto">
          <h3 className="text-white font-bold tracking-tight mb-4 flex items-center gap-2">
            <Box className="w-4 h-4 text-cyan-400" />
            Repository Network
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
              <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Authors</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
              <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Commits</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]"></div>
              <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Branches</span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/5 flex flex-col gap-2">
            <button 
              onClick={() => setIs3D(!is3D)}
              className="flex items-center justify-between gap-4 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-[10px] font-mono text-gray-300 uppercase tracking-widest"
            >
              <span className="flex items-center gap-2">
                {is3D ? <Zap className="w-3 h-3 text-yellow-400" /> : <ZapOff className="w-3 h-3 text-gray-500" />}
                {is3D ? '3D Mode' : '2D Mode'}
              </span>
              <div className={cn("w-8 h-4 rounded-full relative transition-colors", is3D ? "bg-emerald-500/40" : "bg-gray-700")}>
                <div className={cn("absolute top-1 w-2 h-2 rounded-full bg-white transition-all", is3D ? "right-1" : "left-1")} />
              </div>
            </button>
            <button 
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-[10px] font-mono text-gray-300 uppercase tracking-widest"
            >
              <RotateCcw className="w-3 h-3 text-cyan-400" />
              Reset View
            </button>
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div className="absolute inset-0 flex items-center justify-center flex-col gap-4">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <ZapOff className="w-8 h-8 text-gray-600" />
          </div>
          <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">No graph data available</p>
        </div>
      ) : !isReady ? (
        <div className="absolute inset-0 flex items-center justify-center flex-col gap-4">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest animate-pulse">Initializing Graph...</p>
        </div>
      ) : (
        <div key={`${data.stats.url}-${is3D ? '3d' : '2d'}`} className="w-full h-full">
          {is3D ? (
            <ForceGraph3D
              ref={fgRef}
              width={dimensions.width}
              height={dimensions.height}
              graphData={graphData}
              nodeId="id"
              nodeLabel="name"
              onEngineTick={handleEngineTick}
              cooldownTicks={100}
              nodeColor={node => {
                if (node.group === 'author') return '#22d3ee';
                if (node.group === 'commit') return '#10b981';
                if (node.group === 'commit_parent') return '#064e3b';
                if (node.group === 'branch') return '#a855f7';
                return '#ffffff';
              }}
              linkColor={link => {
                if (link.type === 'author-commit') return 'rgba(34, 211, 238, 0.2)';
                if (link.type === 'parent-commit') return 'rgba(16, 185, 129, 0.4)';
                if (link.type === 'branch-head') return 'rgba(168, 85, 247, 0.6)';
                return 'rgba(255,255,255,0.1)';
              }}
              nodeRelSize={4}
              onNodeClick={onNodeClick}
              linkDirectionalParticles={link => link.type === 'parent-commit' ? 2 : 0}
              linkDirectionalParticleSpeed={0.005}
              backgroundColor="#030305"
              showNavInfo={false}
            />
          ) : (
            <ForceGraph2D
              ref={fgRef}
              width={dimensions.width}
              height={dimensions.height}
              graphData={graphData}
              nodeId="id"
              nodeLabel={node => `
                <div style="
                  background: rgba(3, 3, 5, 0.95);
                  color: ${node.group === 'author' ? '#22d3ee' : (node.group === 'branch' ? '#a855f7' : '#ffffff')};
                  padding: 8px 12px;
                  border-radius: 12px;
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 11px;
                  font-weight: 600;
                  pointer-events: none;
                  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                  backdrop-filter: blur(8px);
                  text-transform: uppercase;
                  letter-spacing: 0.05em;
                ">
                  ${node.name}
                </div>
              `}
              onEngineTick={handleEngineTick}
              cooldownTicks={100}
              nodeColor={node => {
                if (node.group === 'author') return '#22d3ee';
                if (node.group === 'commit') return '#10b981';
                if (node.group === 'commit_parent') return '#064e3b';
                if (node.group === 'branch') return '#a855f7';
                return '#ffffff';
              }}
              linkColor={link => {
                if (link.type === 'author-commit') return 'rgba(34, 211, 238, 0.2)';
                if (link.type === 'parent-commit') return 'rgba(16, 185, 129, 0.4)';
                if (link.type === 'branch-head') return 'rgba(168, 85, 247, 0.6)';
                return 'rgba(255,255,255,0.1)';
              }}
              nodeRelSize={6}
              onNodeClick={onNodeClick}
              linkDirectionalParticles={link => link.type === 'parent-commit' ? 2 : 0}
              linkDirectionalParticleSpeed={0.005}
              backgroundColor="#030305"
            />
          )}
        </div>
      )}
      
      <div className="absolute bottom-6 right-6 pointer-events-none">
        <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[9px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2">
          <Maximize2 className="w-3 h-3" />
          {is3D ? 'Drag to rotate • Scroll to zoom' : 'Drag to pan • Scroll to zoom'}
        </div>
      </div>
    </div>
  );
}
