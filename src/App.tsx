import React, { useState, useEffect } from 'react';
import { Search, GitMerge, Loader2, AlertCircle, Settings, X, Key, BookOpen, ExternalLink } from 'lucide-react';
import { fetchRepoData, RepoData } from './lib/api';
import { Dashboard } from './components/Dashboard';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RepoData | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [githubToken, setGithubToken] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('github_token');
    if (token) {
      setGithubToken(token);
    }
  }, []);

  const saveToken = (token: string) => {
    setGithubToken(token);
    if (token.trim()) {
      localStorage.setItem('github_token', token.trim());
    } else {
      localStorage.removeItem('github_token');
    }
    setShowSettings(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setData(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const result = await fetchRepoData(url.trim(), controller.signal);
      setData(result);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Request timed out. The repository might be too large or the network is slow.');
      } else {
        setError(err.message || 'An unexpected error occurred.');
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!url.trim() || !data) return;
    
    setRefreshing(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
      const result = await fetchRepoData(url.trim(), controller.signal);
      setData(result);
    } catch (err: any) {
      console.error("Failed to refresh data:", err);
      // Don't clear existing data on refresh failure, just show a console error or toast
    } finally {
      clearTimeout(timeoutId);
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030305] text-gray-100 font-sans selection:bg-emerald-500/30 overflow-hidden relative">
      {/* WebGL-like Atmospheric Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid-pattern opacity-40" />
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[150px]" />
        <div className="absolute top-[40%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[80%] h-[40%] rounded-full bg-emerald-900/10 blur-[120px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-screen overflow-y-auto custom-scrollbar flex flex-col">
        {/* Top Navigation */}
        <nav className="sticky top-0 z-50 glass-panel border-x-0 border-t-0 rounded-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                <GitMerge className="w-5 h-5 text-[#030305]" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white text-glow">
                GitTracker Pro
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowDocs(true)}
                className="p-2 text-gray-400 hover:text-emerald-400 transition-colors bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 flex items-center gap-2 text-sm font-medium"
                title="Documentation"
              >
                <BookOpen className="w-5 h-5" />
                <span className="hidden sm:inline">Docs</span>
              </button>
              <button 
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-400 hover:text-emerald-400 transition-colors bg-white/5 hover:bg-white/10 rounded-lg border border-white/5"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </nav>

        {/* Settings Modal */}
        <AnimatePresence>
          {showSettings && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-[#0a0a0f] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full pointer-events-none" />
                
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-emerald-400" />
                    Settings
                  </h2>
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 relative z-10">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                      <Key className="w-4 h-4 text-emerald-400" />
                      GitHub Personal Access Token
                    </label>
                    <input 
                      type="password"
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 font-mono text-sm transition-all"
                    />
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                      GitHub limits unauthenticated requests to 60 per hour. Because GitTracker Pro fetches a lot of data at once, you might hit this limit quickly. Add a token to increase this limit to 5,000 per hour. Your token is stored locally in your browser.
                    </p>
                  </div>
                  
                  <div className="pt-4 flex justify-end gap-3">
                    <button 
                      onClick={() => setShowSettings(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => saveToken(githubToken)}
                      className="px-6 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 font-bold rounded-xl transition-all text-sm"
                    >
                      Save Token
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Docs Modal */}
        <AnimatePresence>
          {showDocs && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-[#0a0a0f] border border-white/10 rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />
                
                <div className="flex items-center justify-between mb-6 relative z-10 shrink-0">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <BookOpen className="w-6 h-6 text-blue-400" />
                    Documentation & Guide
                  </h2>
                  <button 
                    onClick={() => setShowDocs(false)}
                    className="p-1 text-gray-400 hover:text-white transition-colors bg-white/5 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6 relative z-10 overflow-y-auto custom-scrollbar pr-2 pb-4">
                  <section>
                    <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                      <Search className="w-4 h-4 text-emerald-400" /> What is GitTracker Pro?
                    </h3>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      GitTracker Pro is a fast, real-time dashboard for analyzing GitHub and GitLab repositories. It fetches commits, contributors, branches, and file changes in parallel to give you instant insights into any public codebase.
                    </p>
                  </section>

                  <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                      <Key className="w-4 h-4 text-emerald-400" /> How to Fix Rate Limits (Get a Token)
                    </h3>
                    <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                      GitHub limits anonymous API requests to <strong>60 per hour</strong>. Because GitTracker Pro fetches a lot of data at once, you might hit this limit quickly. Adding a free Personal Access Token increases your limit to <strong>5,000 per hour</strong>.
                    </p>
                    
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-white">Step-by-Step Guide:</h4>
                      <ol className="list-decimal list-inside text-sm text-gray-300 space-y-2 font-light">
                        <li>Log in to your <a href="https://github.com" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">GitHub account</a>.</li>
                        <li>Go to <strong>Settings</strong> (click your profile picture in the top right).</li>
                        <li>Scroll down to the bottom left and click <strong>Developer settings</strong>.</li>
                        <li>Click <strong>Personal access tokens</strong>, then select <strong>Tokens (classic)</strong>.</li>
                        <li>Click the <strong>Generate new token</strong> dropdown and select <strong>Generate new token (classic)</strong>.</li>
                        <li>Give it a Note (e.g., "GitTracker Pro App").</li>
                        <li><strong>Important:</strong> You do <em>not</em> need to check any scope boxes for public repositories. Leave them all blank.</li>
                        <li>Scroll to the bottom and click <strong>Generate token</strong>.</li>
                        <li>Copy the generated token (it starts with <code className="bg-black/30 px-1.5 py-0.5 rounded text-emerald-300">ghp_...</code>).</li>
                        <li>Open the <strong>Settings</strong> menu in GitTracker Pro (top right gear icon), paste the token, and click Save.</li>
                      </ol>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                      <GitMerge className="w-4 h-4 text-emerald-400" /> Features
                    </h3>
                    <ul className="list-disc list-inside text-sm text-gray-300 space-y-2 font-light">
                      <li><strong>Instant Search:</strong> Paste any GitHub or GitLab URL (e.g., <code className="bg-white/10 px-1.5 py-0.5 rounded">https://github.com/facebook/react</code>).</li>
                      <li><strong>Commit Log:</strong> View recent commits, authors, and timestamps.</li>
                      <li><strong>File Changes:</strong> Click "Show Changed Files" on any commit to see exactly what was added, modified, or deleted.</li>
                      <li><strong>Branch Comparison:</strong> Select two branches to see how far ahead or behind they are, and view the divergent commits.</li>
                      <li><strong>Network Graph:</strong> Visualize the recent commit history and branching structure.</li>
                    </ul>
                  </section>
                  <section className="pt-4 border-t border-white/5">
                    <p className="text-xs text-gray-500 italic">
                      GitTracker Pro is an advanced repository analytics tool designed for developers and project managers.
                    </p>
                  </section>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          {/* Search Section */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-bold tracking-tighter text-white mb-6"
            >
              Track Any <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Repository</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-gray-400 mb-10 font-light"
            >
              Enter a GitHub or GitLab repository URL to instantly analyze commits, contributors, and project history. Free and open source.
            </motion.p>

            <motion.form 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onSubmit={handleSearch} 
              className="relative max-w-2xl mx-auto group"
            >
              <div className="relative flex items-center">
                <Search className="absolute left-5 w-5 h-5 text-emerald-500/70 group-focus-within:text-emerald-400 transition-colors" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://github.com/facebook/react"
                  className="w-full pl-14 pr-36 py-5 glass-panel rounded-full focus:outline-none focus:border-emerald-500/50 focus:shadow-[0_0_30px_rgba(16,185,129,0.2)] text-white placeholder-gray-500 transition-all font-mono text-sm"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 top-2 bottom-2 px-8 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 font-bold tracking-wide rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 uppercase text-xs"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analyze'}
                </button>
              </div>
            </motion.form>
          </div>

          {/* Content Area */}
          <div className="min-h-[400px]">
            <AnimatePresence mode="wait">
              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center justify-center py-32"
                >
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full blur-xl bg-emerald-500/30 animate-pulse" />
                    <Loader2 className="w-16 h-16 text-emerald-400 animate-spin relative z-10" />
                  </div>
                  <p className="text-emerald-400/70 font-mono mt-6 animate-pulse tracking-widest text-sm uppercase">Establishing Connection...</p>
                </motion.div>
              )}

              {error && !loading && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="max-w-2xl mx-auto p-6 glass-panel border-red-500/30 rounded-2xl flex items-start gap-4 shadow-[0_0_30px_rgba(239,68,68,0.1)]"
                >
                  <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-bold text-red-400 mb-1 tracking-tight">Analysis Failed</h3>
                    <p className="text-gray-300 font-mono text-sm">{error}</p>
                  </div>
                </motion.div>
              )}

              {data && !loading && !error && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                >
                  <Dashboard data={data} onRefresh={handleRefresh} refreshing={refreshing} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
