import React, { useEffect, useRef, useState, useMemo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { RepoData } from '../lib/api';

export function NetworkGraph({ data, onNodeClick }: { data: RepoData, onNodeClick?: (node: any) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        setDimensions({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const graphData = useMemo(() => {
    const nodes: any[] = [];
    const links: any[] = [];
    const nodeIds = new Set<string>();

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

  useEffect(() => {
    if (fgRef.current) {
      // Configure forces to keep the graph compact and readable
      fgRef.current.d3Force('charge').strength(-40);
      fgRef.current.d3Force('link').distance(30);
      fgRef.current.d3Force('center').strength(0.05);
      fgRef.current.d3ReheatSimulation();
    }
  }, [graphData]);

  return (
    <div ref={containerRef} className="w-full h-[600px] rounded-3xl overflow-hidden glass-panel relative group">
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-3 pointer-events-none bg-[#030305]/80 p-4 rounded-xl backdrop-blur-md border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        <h3 className="text-white font-bold tracking-tight mb-1">Repository Network (3D)</h3>
        <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div><span className="text-xs text-gray-300 font-mono">Authors</span></div>
        <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div><span className="text-xs text-gray-300 font-mono">Commits</span></div>
        <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]"></div><span className="text-xs text-gray-300 font-mono">Branches</span></div>
      </div>
      
      <ForceGraph3D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        nodeLabel="name"
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
        backgroundColor="rgba(0,0,0,0)"
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />
    </div>
  );
}
