import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Server, Database, Loader2 } from 'lucide-react';

interface SystemConfigProps {
  onConnect: (config: any) => void;
  isConnecting: boolean;
  isConnected: boolean;
}

export const SystemConfig = ({
  onConnect,
  isConnecting,
  isConnected
}: SystemConfigProps) => {
  const [config, setConfig] = useState({
    sshHost: '',
    sshUser: '',
    sshPassword: '',
    dbName: '',
    dbUser: '',
    dbPass: '',
    sshPort: 22,
    dbHost: '127.0.0.1',
    dbPort: 3306,
    localPort: 3307
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConnect(config);
  };

  return (
    <div className="w-full max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h2 className="text-3xl font-bold mb-2">System Interconnect</h2>
        <p className="text-slate-400">Configure SSH tunnels and secure database bridges here.</p>
      </header>

      <div className={`p-4 rounded-2xl border ${isConnected ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-slate-800/10 border-white/5 text-slate-400'} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          {isConnected ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
          <span className="font-bold tracking-wide uppercase text-sm">Status: {isConnected ? 'SECURE' : 'DISCONNECTED'}</span>
        </div>
        {isConnected && <span className="text-xs font-mono px-2 py-1 bg-emerald-500/20 rounded border border-emerald-500/20">Active Session Ready</span>}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#161b26]/60 backdrop-blur-md rounded-3xl p-8 border border-white/5 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 mb-4 text-indigo-400">
            <Server className="w-5 h-5" />
            <h3 className="font-bold text-lg tracking-tight">CentOS Server (SSH)</h3>
          </div>
          <fieldset disabled={isConnected || isConnecting} className="space-y-4">
            <input 
              type="text" placeholder="SSH IP / Host" required
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-indigo-500/50 transition-all font-medium"
              value={config.sshHost} onChange={e => setConfig({...config, sshHost: e.target.value})}
            />
            <input 
              type="text" placeholder="SSH User" required
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-indigo-500/50 transition-all font-medium"
              value={config.sshUser} onChange={e => setConfig({...config, sshUser: e.target.value})}
            />
            <input 
              type="password" placeholder="SSH Password" required
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-indigo-500/50 transition-all font-medium"
              value={config.sshPassword} onChange={e => setConfig({...config, sshPassword: e.target.value})}
            />
          </fieldset>
        </div>

        <div className="bg-[#161b26]/60 backdrop-blur-md rounded-3xl p-8 border border-white/5 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 mb-4 text-emerald-400">
            <Database className="w-5 h-5" />
            <h3 className="font-bold text-lg tracking-tight">Database Infrastructure</h3>
          </div>
          <fieldset disabled={isConnected || isConnecting} className="space-y-4">
            <input 
              type="text" placeholder="DB Name" required
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-emerald-500/50 transition-all font-medium"
              value={config.dbName} onChange={e => setConfig({...config, dbName: e.target.value})}
            />
            <input 
              type="text" placeholder="DB User" required
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-emerald-500/50 transition-all font-medium"
              value={config.dbUser} onChange={e => setConfig({...config, dbUser: e.target.value})}
            />
            <input 
              type="password" placeholder="DB Password" required
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-emerald-500/50 transition-all font-medium"
              value={config.dbPass} onChange={e => setConfig({...config, dbPass: e.target.value})}
            />
          </fieldset>
        </div>

        <div className="md:col-span-2 pt-4">
          {!isConnected ? (
            <button type="submit" disabled={isConnecting} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2">
              {isConnecting ? <Loader2 className="w-6 h-6 animate-spin" /> : <ShieldCheck className="w-6 h-6" />}
              {isConnecting ? 'Establishing Tunnel...' : 'Establish Secure Connection'}
            </button>
          ) : (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold rounded-2xl text-center">
              System Securely Connected
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
