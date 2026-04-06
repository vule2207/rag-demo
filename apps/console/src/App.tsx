import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { SystemConfig } from './features/system-config/SystemConfig';
import { KnowledgeBase } from './features/knowledge-base/KnowledgeBase';
import { ChatInterface } from './features/chat/ChatInterface';
import { useChat } from './hooks/useChat';
import { useKnowledgeBase } from './hooks/useKnowledgeBase';
import { mcpService } from './services/api';

function App() {
  const [activeTab, setActiveTab] = useState<'system' | 'knowledge' | 'chat'>('system');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Use our specialized hooks
  const { chatHistory, chatInput, setChatInput, isBotTyping, handleSendMessage } = useChat();
  const { documents, isUploading, handleUpload, handleDelete } = useKnowledgeBase();

  const handleConnect = async (config: any) => {
    setIsConnecting(true);
    try {
      await mcpService.connect(config);
      setIsConnected(true);
      setActiveTab('chat');
    } catch (error) {
      alert("System connection failed. Check your credential logs.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await mcpService.disconnect();
      setIsConnected(false);
      setActiveTab('system');
    } catch (error) {
      console.error("Disconnect failed", error);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0a0d14] text-slate-200 font-sans selection:bg-indigo-500/30">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isConnected={isConnected} onDisconnect={handleDisconnect} />

      <main className="flex-1 overflow-hidden relative flex flex-col p-4 md:p-8">
        {/* Background Decorative Elements */}
        {/* <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" /> */}

        {activeTab === 'system' && (
          <SystemConfig onConnect={handleConnect} isConnecting={isConnecting} isConnected={isConnected} />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeBase documents={documents} onUpload={handleUpload} onDelete={handleDelete} isUploading={isUploading} />
        )}

        {activeTab === 'chat' && (
          <ChatInterface
            chatHistory={chatHistory}
            chatInput={chatInput}
            setChatInput={setChatInput}
            isBotTyping={isBotTyping}
            documentsCount={documents.length}
            handleSendMessage={handleSendMessage}
          />
        )}
      </main>
    </div>
  );
}

export default App;