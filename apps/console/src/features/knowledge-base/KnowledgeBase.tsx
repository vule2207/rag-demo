import { FileText, Upload, Trash2, Loader2, Database } from 'lucide-react';

interface KnowledgeBaseProps {
  documents: string[];
  onUpload: (file: File) => void;
  onDelete: (filename: string) => void;
  isUploading: boolean;
}

export const KnowledgeBase = ({
  documents,
  onUpload,
  onDelete,
  isUploading
}: KnowledgeBaseProps) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden flex flex-col h-full">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Neural Knowledge Base</h2>
          <p className="text-slate-400">Upload PDF documents to expand the Agent's cognitive retrieval field.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold uppercase tracking-widest">
            <Database className="w-3.5 h-3.5" />
            Vector Store Active
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Upload Block */}
        <div className="bg-[#161b26]/60 backdrop-blur-md rounded-3xl p-8 border border-white/5 shadow-2xl flex flex-col items-center justify-center text-center space-y-6 group">
          <div className="w-20 h-20 rounded-full bg-indigo-600/10 border-2 border-dashed border-indigo-500/30 flex items-center justify-center group-hover:border-indigo-500/60 transition-all duration-300">
            {isUploading ? <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /> : <Upload className="w-8 h-8 text-indigo-400" />}
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-lg">Inject New Knowledge</h3>
            <p className="text-xs text-slate-500 leading-relaxed px-4">Supported formats: PDF. Documents are automatically chunked and vectorized for RAG retrieval.</p>
          </div>
          <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-3 px-6 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50">
            <span>{isUploading ? 'Processing...' : 'Choose File'}</span>
            <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} disabled={isUploading} />
          </label>
        </div>

        {/* Document List Block */}
        <div className="md:col-span-2 bg-[#161b26]/60 backdrop-blur-md rounded-3xl border border-white/5 shadow-2xl overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Indexed Documents ({documents.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {documents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 italic text-sm py-20">
                No documents indexed in neural memory.
              </div>
            ) : (
              documents.map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group animate-in slide-in-from-right-4 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-200 line-clamp-1">{doc}</p>
                      <p className="text-[10px] text-slate-500 font-mono uppercase tracking-tighter">Status: Vectorized & Ready</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onDelete(doc)}
                    className="p-2 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
