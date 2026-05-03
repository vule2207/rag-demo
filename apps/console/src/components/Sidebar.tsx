import { useEffect, useState } from 'react';
import { Activity, Settings, Library, MessageSquare, LogOut, Plus, Trash2, Clock } from 'lucide-react';
import { ragService } from '../services/api';

interface SidebarProps {
  activeTab: 'system' | 'knowledge' | 'chat';
  setActiveTab: (tab: 'system' | 'knowledge' | 'chat') => void;
  isConnected: boolean;
  onDisconnect?: () => void;
  currentSessionId: string | null;
  onSessionSelect: (id: string) => void;
  onNewChat: () => void;
}

export const Sidebar = ({ 
  activeTab, 
  setActiveTab, 
  isConnected, 
  onDisconnect,
  currentSessionId,
  onSessionSelect,
  onNewChat
}: SidebarProps) => {
  const [sessions, setSessions] = useState<any[]>([]);

  const fetchSessions = async () => {
    try {
      const data = await ragService.listSessions();
      setSessions(data.sessions);
    } catch (error) {
      console.error("Failed to fetch sessions", error);
    }
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      fetchSessions();
    }
  }, [activeTab, currentSessionId]);

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this chat session?")) {
      try {
        await ragService.deleteSession(id);
        fetchSessions();
        if (currentSessionId === id) {
          onNewChat();
        }
      } catch (error) {
        console.error("Delete session failed", error);
      }
    }
  };

  return (
    <aside className="w-72 bg-[#161b26] border-r border-white/5 flex flex-col p-4 animate-in fade-in slide-in-from-left duration-500 overflow-hidden">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shadow-lg shadow-indigo-500/10">
          <Activity className="w-6 h-6 text-indigo-400" />
        </div>
        <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          Hanbiro VN
        </span>
      </div>

      <nav className="space-y-2 shrink-0">
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

      {/* Sessions List */}
      {activeTab === 'chat' && (
        <div className="mt-8 flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between px-2 mb-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recent Chats</span>
            <button 
              onClick={onNewChat}
              className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
              title="New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
            {sessions.length === 0 ? (
              <div className="p-4 text-center border-2 border-dashed border-white/5 rounded-2xl">
                <p className="text-[10px] text-slate-600 font-medium italic">No recent sessions found</p>
              </div>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => onSessionSelect(s.id)}
                  className={`group relative flex flex-col gap-1 p-3 rounded-xl cursor-pointer transition-all duration-200 border ${
                    currentSessionId === s.id 
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-white' 
                    : 'border-transparent text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold truncate max-w-[160px]">{s.title}</span>
                    <button 
                      onClick={(e) => handleDeleteSession(e, s.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/20 rounded-md transition-all text-slate-600 hover:text-rose-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-600 font-medium">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(s.updated_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="mt-auto p-4 bg-white/5 rounded-2xl border border-white/5 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-500'}`} />
            Groupware Dept
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
        <p className="text-[10px] text-slate-500 font-medium">© 2026 Groupware Lab</p>
      </div>
    </aside>
  );
};
