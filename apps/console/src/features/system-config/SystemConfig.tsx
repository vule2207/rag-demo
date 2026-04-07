import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Server, Database, Loader2, Wrench, Terminal, Cpu, Search, Code, Info } from 'lucide-react';
import { mcpService } from '../../services/api';

interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

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

  const [tools, setTools] = useState<McpTool[]>([]);
  const [isLoadingTools, setIsLoadingTools] = useState(false);

  useEffect(() => {
    if (isConnected) {
      fetchTools();
    } else {
      setTools([]);
    }
  }, [isConnected]);

  const fetchTools = async () => {
    setIsLoadingTools(true);
    try {
      const data = await mcpService.getTools();
      setTools(data.tools || []);
    } catch (error) {
      console.error("Failed to fetch tools", error);
    } finally {
      setIsLoadingTools(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConnect(config);
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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

      {isConnected && (
        <div className="space-y-6 pt-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Cpu className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold">MCP Capabilities</h3>
              <p className="text-slate-400 text-sm">Real-time tools exposed by the connected MCP server.</p>
            </div>
          </div>

          {isLoadingTools ? (
            <div className="flex items-center gap-2 text-slate-500 animate-pulse py-8">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Scanning for available tools...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tools.length > 0 ? tools.map((tool: McpTool) => (
                <div key={tool.name} className="group bg-[#161b26]/40 hover:bg-[#1c2331]/60 backdrop-blur-sm border border-white/5 hover:border-indigo-500/30 rounded-2xl p-5 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-slate-900/80 rounded-xl border border-white/5 group-hover:border-indigo-500/20 transition-colors">
                      {tool.name.includes('query') || tool.name.includes('db') ? <Database className="w-5 h-5 text-emerald-400" /> : 
                       tool.name.includes('log') ? <Search className="w-5 h-5 text-amber-400" /> : 
                       <Terminal className="w-5 h-5 text-indigo-400" />}
                    </div>
                    <Wrench className="w-4 h-4 text-slate-700 group-hover:text-indigo-400/50 transition-colors" />
                  </div>
                  <h4 className="font-bold text-slate-200 mb-1 group-hover:text-indigo-300 transition-colors">{tool.name}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-4">
                    {tool.description}
                  </p>
                  
                  <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                    <Code className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                      {Object.keys(tool.inputSchema.properties || {}).length} Parameters
                    </span>
                  </div>
                </div>
              )) : (
                <div className="col-span-full py-12 text-center bg-slate-900/20 rounded-3xl border border-dashed border-white/10">
                  <Info className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500">No tools detected. Ensure the MCP server is operational.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
