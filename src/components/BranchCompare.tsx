import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitCompare, GitBranch, ArrowRight, FileDiff, CheckCircle2, AlertTriangle, Loader2, Plus, Minus } from 'lucide-react';
import { Branch, ComparisonData, fetchBranchComparison } from '../lib/api';
import { cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';

export function BranchCompare({ branches, repoUrl }: { branches: Branch[], repoUrl: string }) {
  const [base, setBase] = useState(branches[0]?.name || '');
  const [head, setHead] = useState(branches.length > 1 ? branches[1].name : branches[0]?.name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ComparisonData | null>(null);

  const handleCompare = async () => {
    if (!base || !head || base === head) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchBranchComparison(repoUrl, base, head);
      setData(result);
    } catch (err: any) {
      setError(err.message || "Failed to compare branches.");
    } finally {
      setLoading(false);
    }
  };

  if (branches.length < 2) {
    return null; // Need at least two branches to compare
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 glass-panel rounded-3xl relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <h2 className="text-xl font-bold text-white mb-6 tracking-tight flex items-center gap-2 relative z-10">
        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
        Branch Comparison
      </h2>

      <div className="relative z-10 flex flex-col md:flex-row items-end gap-4 mb-8">
        <div className="flex-1 w-full">
          <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Base Branch</label>
          <div className="relative">
            <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <select 
              value={base} 
              onChange={e => setBase(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:border-blue-500/50 transition-colors font-mono text-sm"
            >
              {branches.map(b => <option key={b.name} value={b.name} className="bg-[#0f0f14]">{b.name}</option>)}
            </select>
          </div>
        </div>
        
        <div className="hidden md:flex items-center justify-center pb-3 px-2">
          <ArrowRight className="w-5 h-5 text-gray-600" />
        </div>

        <div className="flex-1 w-full">
          <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Compare Branch</label>
          <div className="relative">
            <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <select 
              value={head} 
              onChange={e => setHead(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:border-blue-500/50 transition-colors font-mono text-sm"
            >
              {branches.map(b => <option key={b.name} value={b.name} className="bg-[#0f0f14]">{b.name}</option>)}
            </select>
          </div>
        </div>

        <button 
          onClick={handleCompare}
          disabled={loading || base === head}
          className="w-full md:w-auto px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-400 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase text-xs tracking-wider"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitCompare className="w-4 h-4" />}
          Compare
        </button>
      </div>

      {error && (
        <div className="p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-mono flex items-center gap-2 relative z-10">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {data && !loading && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6 relative z-10"
          >
            {/* Status Card */}
            <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl">
              {data.status === 'identical' ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              ) : data.status === 'diverged' ? (
                <GitCompare className="w-8 h-8 text-orange-400" />
              ) : (
                <ArrowRight className="w-8 h-8 text-blue-400" />
              )}
              <div>
                <p className="text-white font-bold capitalize text-lg">{data.status}</p>
                <p className="text-sm text-gray-400 font-mono">
                  {data.aheadBy} commits ahead, {data.behindBy} commits behind
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Commits List */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col max-h-[400px]">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-blue-400" />
                  Divergent Commits ({data.commits.length})
                </h3>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                  {data.commits.length === 0 ? (
                    <p className="text-xs text-gray-500 font-mono text-center py-4">No divergent commits.</p>
                  ) : (
                    data.commits.map(commit => (
                      <div key={commit.sha} className="p-3 bg-black/20 rounded-lg border border-white/5">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-bold text-white truncate pr-2">{commit.authorName}</span>
                          <a href={commit.url} target="_blank" rel="noreferrer" className="text-xs font-mono text-blue-400 hover:underline shrink-0">
                            {commit.sha.substring(0, 7)}
                          </a>
                        </div>
                        <p className="text-xs text-gray-300 line-clamp-2 mb-2">{commit.message}</p>
                        <p className="text-[10px] text-gray-500 font-mono">{format(parseISO(commit.date), 'MMM d, yyyy HH:mm')}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Files Changed */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col max-h-[400px]">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <FileDiff className="w-4 h-4 text-emerald-400" />
                  Files Changed ({data.files.length})
                </h3>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                  {data.files.length === 0 ? (
                    <p className="text-xs text-gray-500 font-mono text-center py-4">No files changed.</p>
                  ) : (
                    data.files.map(file => (
                      <div key={file.filename} className="flex items-center justify-between p-2 bg-black/20 rounded-lg border border-white/5">
                        <span className="text-xs font-mono text-gray-300 truncate pr-4" title={file.filename}>
                          {file.filename}
                        </span>
                        <div className="flex items-center gap-2 shrink-0 text-xs font-mono">
                          {file.additions > 0 && <span className="text-emerald-400 flex items-center"><Plus className="w-3 h-3"/>{file.additions}</span>}
                          {file.deletions > 0 && <span className="text-red-400 flex items-center"><Minus className="w-3 h-3"/>{file.deletions}</span>}
                          {file.additions === 0 && file.deletions === 0 && <span className="text-gray-500 capitalize">{file.status}</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
