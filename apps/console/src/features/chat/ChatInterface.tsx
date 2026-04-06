import { useRef, useEffect } from 'react';
import {
  MessageSquare,
  ShieldCheck,
  Activity,
  Send,
  Loader2,
  Database,
  Search,
  FileSearch,
  Terminal,
  ChevronDown,
  Cpu
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Step {
  tool: string;
  tool_input: any;
  thought: string;
  output: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  steps?: Step[];
}

interface ChatInterfaceProps {
  chatHistory: Message[];
  chatInput: string;
  setChatInput: (input: string) => void;
  isBotTyping: boolean;
  documentsCount: number;
  handleSendMessage: (e: React.FormEvent) => void;
}

const ToolIcon = ({ tool }: { tool: string }) => {
  switch (tool) {
    case 'search_knowledge_base': return <Search className="w-4 h-4 text-indigo-400" />;
    case 'query_database': return <Database className="w-4 h-4 text-emerald-400" />;
    case 'get_database_schema': return <FileSearch className="w-4 h-4 text-amber-400" />;
    case 'search_api_logs': return <Terminal className="w-4 h-4 text-rose-400" />;
    default: return <Cpu className="w-4 h-4 text-slate-400" />;
  }
};

const ToolStep = ({ step }: { step: Step }) => (
  <div className="mb-4 last:mb-0 animate-in fade-in slide-in-from-left-2 duration-300">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 shadow-sm">
        <ToolIcon tool={step.tool} />
      </div>
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        Agent used: <span className="text-slate-200">{step.tool.replace(/_/g, ' ')}</span>
      </span>
    </div>

    <div className="ml-8 space-y-2">
      {step.thought && (
        <p className="text-xs text-slate-500 italic leading-relaxed border-l-2 border-white/5 pl-3">
          {step.thought.split('Action:')[0].replace('Thought:', '').trim()}
        </p>
      )}

      <div className="bg-slate-900/40 rounded-xl border border-white/5 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/5">
          <span className="text-[10px] font-mono text-slate-500 uppercase">Output Result</span>
          <ChevronDown className="w-3 h-3 text-slate-600" />
        </div>
        <pre className="p-3 text-[11px] font-mono whitespace-pre-wrap text-slate-300 max-h-40 overflow-y-auto custom-scrollbar">
          {step.output}
        </pre>
      </div>
    </div>
  </div>
);

export const ChatInterface = ({
  chatHistory,
  chatInput,
  setChatInput,
  isBotTyping,
  documentsCount,
  handleSendMessage
}: ChatInterfaceProps) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isBotTyping]);

  return (
    <div className="w-full h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between shrink-0 mb-8 mt-2">
        <div>
          <h2 className="text-3xl font-bold mb-2 text-white">Agentic RAG Console</h2>
          <p className="text-slate-400 flex items-center gap-2 text-sm font-medium">
            <Activity className="w-4 h-4 text-indigo-400 animate-pulse" />
            Active Brain: Gemma 4 (31B) + MCP Tools Integrated
          </p>
        </div>
        <div className="flex gap-2">
          <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Knowledge Ready: {documentsCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MCP Active</span>
          </div>
        </div>
      </header>

      <div className="flex-1 bg-[#161b26]/40 backdrop-blur-sm rounded-3xl border border-white/5 flex flex-col overflow-hidden shadow-2xl relative">
        {/* Messages Panel */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth overflow-x-hidden">
          {chatHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-6">
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-700/50 flex items-center justify-center bg-slate-800/10">
                <MessageSquare className="w-10 h-10 opacity-20" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-bold tracking-tight text-slate-400">Neural Interfacer Online</p>
                <p className="text-xs text-slate-600 max-w-sm px-8 leading-relaxed">
                  I can analyze your uploaded documents or query the production database and logs directly through the MCP protocol.
                </p>
              </div>
            </div>
          ) : (
            chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[85%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-6 py-3 shadow-sm border ${msg.role === 'user'
                    ? 'bg-indigo-600 text-white border-indigo-500/50 rounded-[28px] rounded-br-[8px]'
                    : 'bg-transparent text-slate-200 border-transparent rounded-[28px] rounded-bl-[8px] w-full'
                    }`}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-3 text-[10px] font-bold text-indigo-400/80 tracking-widest uppercase">
                        <Cpu className="w-3.5 h-3.5" />
                        Neural_Inference_Core
                      </div>
                    )}
                    
                    {/* Tool execution steps vizualization - Antigravity Style */}
                    {msg.role === 'assistant' && msg.steps && msg.steps.length > 0 && (
                      <details className="mb-4 group max-w-full w-full">
                        <summary className="inline-flex items-center gap-2 cursor-pointer list-none text-slate-500 hover:text-slate-300 transition-colors text-xs font-semibold select-none rounded-full px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10">
                          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Show thinking</span>
                          <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="mt-3 pl-4 space-y-4 border-l-2 border-white/5 pt-2 max-w-full">
                          {msg.steps.map((step, sIdx) => (
                            <ToolStep key={sIdx} step={step} />
                          ))}
                        </div>
                      </details>
                    )}

                    {/* Content */}
                    {msg.content && (
                      <div className={`prose prose-invert max-w-none prose-sm md:prose-base leading-relaxed font-medium ${msg.role === 'user' ? 'text-white' : ''}`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}

                    {/* Inline Loading State */}
                    {msg.role === 'assistant' && isBotTyping && idx === chatHistory.length - 1 && !msg.content && (
                      <div className="flex items-center gap-3 animate-pulse opacity-70 mt-2">
                        <div className="relative">
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                          <div className="absolute inset-0 blur-sm bg-indigo-500/20" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 tracking-widest uppercase italic border-l-2 border-indigo-500/30 pl-3">Synthesizing Intelligence...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Panel */}
        <div className="p-6 bg-white/5 border-t border-white/5 backdrop-blur-xl">
          <form onSubmit={handleSendMessage} className="flex gap-4 p-2 bg-slate-900/60 border border-white/10 rounded-2xl focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all shadow-inner">
            <input
              type="text"
              placeholder={documentsCount > 0 ? "Query neural knowledge or production logs..." : "Add documents to activate RAG knowledge..."}
              disabled={isBotTyping}
              className="flex-1 bg-transparent px-4 py-3 outline-none text-slate-200 font-medium placeholder:text-slate-600 disabled:opacity-50"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isBotTyping}
              className="aspect-square w-12 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-700 text-white flex items-center justify-center rounded-xl transition-all shadow-xl active:scale-[0.9] group"
            >
              <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </form>
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="flex items-center gap-1.5 opacity-40">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-300">Privacy Encrypted</span>
            </div>
            <div className="flex items-center gap-1.5 opacity-40">
              <Database className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-300">MCP Bridge Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
