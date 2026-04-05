import { Activity, Settings, Library, MessageSquare, LogOut } from 'lucide-react';

interface SidebarProps {
  activeTab: 'system' | 'knowledge' | 'chat';
  setActiveTab: (tab: 'system' | 'knowledge' | 'chat') => void;
  isConnected: boolean;
  onDisconnect?: () => void;
}

export const Sidebar = ({ activeTab, setActiveTab, isConnected, onDisconnect }: SidebarProps) => {
  return (
    <aside className="w-64 bg-[#161b26] border-r border-white/5 flex flex-col p-4 animate-in fade-in slide-in-from-left duration-500">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shadow-lg shadow-indigo-500/10">
          <Activity className="w-6 h-6 text-indigo-400" />
        </div>
        <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          Antigravity
        </span>
      </div>

      <nav className="flex-1 space-y-2">
        <button 
          onClick={() => setActiveTab('system')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'system' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-white/5'}`}
        >
          <Settings className="w-5 h-5" />
          <span className="font-semibold text-sm">System Configuration</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('knowledge')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'knowledge' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-white/5'}`}
        >
          <Library className="w-5 h-5" />
          <span className="font-semibold text-sm">Knowledge Base</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('chat')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-white/5'}`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="font-semibold text-sm">Agent Chat</span>
        </button>
      </nav>

      <div className="mt-auto p-4 bg-white/5 rounded-2xl border border-white/5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-500'}`} />
            System Link
          </div>
          {isConnected && onDisconnect && (
            <button 
              onClick={onDisconnect}
              className="p-1 hover:bg-rose-500/20 rounded-md transition-colors text-rose-400"
              title="Secure Disconnect"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p className="text-[10px] text-slate-500 font-medium">© 2026 Deepmind Lab</p>
      </div>
    </aside>
  );
};
