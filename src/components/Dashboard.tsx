import React from 'react';
import { format, parseISO } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { 
  GitCommit, Users, Calendar, Clock, Star, GitFork, AlertCircle, ExternalLink, Network, RefreshCw,
  FileText, Plus, Minus, Edit2, ChevronDown, ChevronUp
} from 'lucide-react';
import { RepoData, Commit, fetchCommitFiles, ComparedFile } from '../lib/api';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import { NetworkGraph } from './NetworkGraph';
import { BranchCompare } from './BranchCompare';

interface DashboardProps {
  data: RepoData;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function Dashboard({ data, onRefresh, refreshing }: DashboardProps) {
  const { stats, contributors, recentCommits, commitsOverTime, branches } = data;

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    try {
      return format(parseISO(dateString), 'MMM d, yyyy HH:mm');
    } catch {
      return 'Invalid Date';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 glass-panel rounded-3xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3 tracking-tight">
              {stats.fullName}
              <a href={stats.url} target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                <ExternalLink className="w-6 h-6" />
              </a>
            </h1>
            {onRefresh && (
              <button 
                onClick={onRefresh}
                disabled={refreshing}
                className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-50"
                title="Refresh Data"
              >
                <RefreshCw className={cn("w-5 h-5 text-emerald-400", refreshing && "animate-spin")} />
              </button>
            )}
          </div>
          {stats.description && (
            <p className="text-gray-400 mt-2 max-w-3xl text-lg font-light">{stats.description}</p>
          )}
        </div>
        <div className="flex items-center gap-6 text-sm font-mono text-gray-300 relative z-10">
          <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-emerald-400">{stats.stars.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
            <GitFork className="w-4 h-4 text-blue-400" />
            <span className="text-emerald-400">{stats.forks.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-emerald-400">{stats.openIssues.toLocaleString()}</span>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard 
          icon={<GitCommit className="w-6 h-6 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]" />}
          title="Total Commits"
          value={stats.totalCommits.toLocaleString()}
          delay={0.1}
        />
        <StatCard 
          icon={<Users className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" />}
          title="Contributors"
          value={stats.totalContributors.toLocaleString()}
          delay={0.2}
        />
      </div>

      {/* First & Last Commit Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <CommitHighlightCard title="Genesis (First Commit)" commit={data.firstCommit} color="purple" delay={0.3} />
        <CommitHighlightCard title="Latest (Last Commit)" commit={data.lastCommit} color="emerald" delay={0.4} />
      </div>

      {/* Branch Comparison */}
      {branches.length >= 2 && (
        <BranchCompare branches={branches} repoUrl={stats.url} />
      )}

      {/* Interactive Network Graph */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full relative"
      >
        <h2 className="text-xl font-bold text-white mb-6 tracking-tight flex items-center gap-2">
          <Network className="w-5 h-5 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
          Interactive Commit Network
        </h2>
        <NetworkGraph data={data} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="lg:col-span-2 p-8 glass-panel rounded-3xl relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <h2 className="text-xl font-bold text-white mb-8 tracking-tight flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
            Activity Matrix
          </h2>
          <div className="h-[350px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={commitsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="rgba(255,255,255,0.3)" 
                  fontSize={12} 
                  fontFamily="JetBrains Mono"
                  tickFormatter={(val) => format(parseISO(val), 'MMM d')}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.3)" 
                  fontSize={12} 
                  fontFamily="JetBrains Mono"
                  allowDecimals={false} 
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 15, 20, 0.8)', 
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(16, 185, 129, 0.3)', 
                    borderRadius: '12px',
                    color: '#fff',
                    fontFamily: 'JetBrains Mono',
                    boxShadow: '0 8px 32px 0 rgba(16, 185, 129, 0.2)'
                  }}
                  itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                  labelFormatter={(label) => format(parseISO(label as string), 'MMM d, yyyy')}
                />
                <Bar 
                  dataKey="count" 
                  fill="#10b981" 
                  radius={[4, 4, 0, 0]} 
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Top Contributors */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="p-8 glass-panel rounded-3xl flex flex-col relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <h2 className="text-xl font-bold text-white mb-6 tracking-tight flex items-center gap-2 relative z-10">
            <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
            Top Contributors
          </h2>
          <div className="flex-1 overflow-y-auto pr-4 space-y-5 max-h-[350px] custom-scrollbar relative z-10">
            {contributors.slice(0, 10).map((contributor, idx) => (
              <div key={contributor.id} className="flex items-center gap-4 group/item">
                <div className="relative">
                  <img 
                    src={contributor.avatarUrl} 
                    alt={contributor.login} 
                    className="w-12 h-12 rounded-full bg-white/5 object-cover border border-white/10 group-hover/item:border-cyan-500/50 transition-colors"
                  />
                  {idx < 3 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-cyan-500 border-2 border-[#0f0f14] flex items-center justify-center text-[10px] font-bold text-black shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                      {idx + 1}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <a 
                    href={contributor.profileUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-sm font-bold text-white hover:text-cyan-400 truncate block transition-colors"
                  >
                    {contributor.login}
                  </a>
                  <p className="text-xs font-mono text-emerald-400 mt-0.5">{contributor.contributions} commits</p>
                </div>
              </div>
            ))}
            {contributors.length === 0 && (
              <p className="text-sm font-mono text-gray-500 text-center py-8">No contributor data available.</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Commits Timeline */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="p-8 glass-panel rounded-3xl relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <h2 className="text-xl font-bold text-white mb-8 tracking-tight flex items-center gap-2 relative z-10">
          <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
          Commit Log
        </h2>
        <div className="space-y-8 relative z-10">
          {recentCommits.slice(0, 15).map((commit, idx) => (
            <div key={commit.sha} className="flex gap-6 relative group/commit">
              {idx !== Math.min(recentCommits.length, 15) - 1 && (
                <div className="absolute top-10 left-6 bottom-[-32px] w-px bg-white/10 group-hover/commit:bg-purple-500/30 transition-colors" />
              )}
              <div className="relative z-10 w-12 h-12 rounded-full bg-white/5 border border-white/10 group-hover/commit:border-purple-500/50 flex items-center justify-center shrink-0 overflow-hidden transition-colors shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                {commit.authorAvatarUrl ? (
                  <img src={commit.authorAvatarUrl} alt={commit.authorName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-purple-400">{commit.authorName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <p className="text-base font-bold text-white truncate group-hover/commit:text-purple-300 transition-colors">
                    {commit.authorName}
                  </p>
                  <span className="text-xs font-mono text-gray-400 whitespace-nowrap bg-white/5 px-3 py-1 rounded-full border border-white/5">
                    {formatDateTime(commit.date)}
                  </span>
                </div>
                <CommitMessage message={commit.message} />
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <a 
                    href={commit.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs font-mono text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-md transition-colors flex items-center gap-2"
                  >
                    <GitCommit className="w-3 h-3" />
                    {commit.sha.substring(0, 7)}
                  </a>
                  <CommitFilesViewer repoUrl={stats.url} sha={commit.sha} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({ icon, title, value, delay }: { icon: React.ReactNode, title: string, value: string | number, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="p-6 glass-panel-hover rounded-3xl flex items-center gap-5 relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="p-4 bg-white/5 rounded-2xl border border-white/10 group-hover:border-white/20 transition-colors relative z-10">
        {icon}
      </div>
      <div className="relative z-10">
        <p className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-1">{title}</p>
        <p className="text-2xl font-bold text-white font-mono">{value}</p>
      </div>
    </motion.div>
  );
}

function CommitHighlightCard({ title, commit, color, delay }: { title: string, commit: Commit | null, color: 'purple' | 'emerald', delay: number }) {
  if (!commit) return null;
  
  const colorClasses = color === 'purple' 
    ? 'from-purple-500/10 border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.1)] text-purple-400'
    : 'from-emerald-500/10 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)] text-emerald-400';
  
  const glowClass = color === 'purple' ? 'bg-purple-500' : 'bg-emerald-500';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`p-8 glass-panel rounded-3xl border bg-gradient-to-br to-transparent ${colorClasses} relative overflow-hidden group`}
    >
      <h3 className={`text-sm font-mono uppercase tracking-widest mb-6 flex items-center gap-2 ${color === 'purple' ? 'text-purple-400' : 'text-emerald-400'}`}>
        <div className={`w-2 h-2 rounded-full ${glowClass} shadow-[0_0_10px_currentColor]`} />
        {title}
      </h3>
      <div className="flex items-center gap-4 mb-6">
        {commit.authorAvatarUrl ? (
          <img src={commit.authorAvatarUrl} alt={commit.authorName} className="w-12 h-12 rounded-full border border-white/10 object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center font-bold text-white text-lg">
            {commit.authorName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-white font-bold text-lg">{commit.authorName}</p>
          <p className="text-xs font-mono text-gray-400">{format(parseISO(commit.date), 'MMM d, yyyy HH:mm:ss')}</p>
        </div>
      </div>
      <div className="bg-black/20 p-4 rounded-xl border border-white/5 mb-4">
        <p className="text-sm text-gray-300 font-light line-clamp-3 leading-relaxed">{commit.message}</p>
      </div>
      <a href={commit.url} target="_blank" rel="noreferrer" className="text-xs font-mono hover:underline flex items-center gap-2 w-fit bg-white/5 px-3 py-1.5 rounded-md">
        <GitCommit className="w-4 h-4" /> {commit.sha.substring(0, 7)}
      </a>
    </motion.div>
  );
}

function CommitMessage({ message }: { message: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const isLong = message.length > 100 || message.includes('\n');
  
  if (!isLong) {
    return <p className="text-sm text-gray-300 break-words font-light leading-relaxed">{message}</p>;
  }

  return (
    <div className="text-sm text-gray-300 break-words font-light leading-relaxed">
      <p className={cn("whitespace-pre-wrap", !expanded && "line-clamp-2")}>
        {message}
      </p>
      <button 
        onClick={() => setExpanded(!expanded)}
        className="text-xs font-mono text-purple-400 hover:text-purple-300 mt-2 focus:outline-none transition-colors uppercase tracking-widest flex items-center gap-1"
      >
        {expanded ? '[-] Collapse' : '[+] Expand'}
      </button>
    </div>
  );
}

function CommitFilesViewer({ repoUrl, sha }: { repoUrl: string, sha: string }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [files, setFiles] = React.useState<ComparedFile[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const toggleOpen = async () => {
    if (!isOpen && !files) {
      setLoading(true);
      try {
        const data = await fetchCommitFiles(repoUrl, sha);
        setFiles(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="w-full sm:w-auto">
      <button 
        onClick={toggleOpen}
        className="flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-md border border-white/5 hover:border-white/10"
      >
        <FileText className="w-3.5 h-3.5" />
        {isOpen ? 'Hide Files' : 'Show Changed Files'}
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      
      {isOpen && (
        <div className="mt-3 p-3 bg-black/40 rounded-xl border border-white/5 w-full">
          {loading && <div className="text-xs text-gray-400 flex items-center gap-2"><RefreshCw className="w-3 h-3 animate-spin" /> Loading files...</div>}
          {error && <div className="text-xs text-red-400">{error}</div>}
          {files && files.length === 0 && <div className="text-xs text-gray-400">No files changed.</div>}
          {files && files.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
              {files.map((f, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono bg-white/5 p-2 rounded-lg">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {f.status === 'added' && <Plus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    {f.status === 'removed' && <Minus className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                    {(f.status === 'modified' || f.status === 'renamed' || f.status === 'changed') && <Edit2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                    <span className="text-gray-300 truncate" title={f.filename}>{f.filename}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {f.additions > 0 && <span className="text-emerald-400 flex items-center gap-1"><Plus className="w-3 h-3"/>{f.additions}</span>}
                    {f.deletions > 0 && <span className="text-red-400 flex items-center gap-1"><Minus className="w-3 h-3"/>{f.deletions}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

