import { useState } from 'react';
import { ragService } from '../services/api';

export interface Step {
  tool: string;
  tool_input: any;
  thought: string;
  output: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  steps?: Step[];
}

export const useChat = () => {
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [chatInput, setChatInput] = useState('');

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isBotTyping) return;

    const userMsg: Message = { role: 'user', content: chatInput, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsBotTyping(true);

    try {
      // Initialize the bot message in the UI
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: '', 
        timestamp: new Date(),
        steps: [] 
      }]);

      await ragService.chatStream(chatInput, (event) => {
        setChatHistory(prev => {
          const newHistory = [...prev];
          const lastMsg = { ...newHistory[newHistory.length - 1] };
          
          if (lastMsg.role !== 'assistant') return prev;

          if (event.type === 'answer_chunk') {
            lastMsg.content += event.data;
          } else if (event.type === 'step_start') {
            const newSteps = [...(lastMsg.steps || [])];
            newSteps.push({
              tool: event.data.tool,
              tool_input: event.data.tool_input,
              thought: '',
              output: ''
            });
            lastMsg.steps = newSteps;
          } else if (event.type === 'step_end') {
            const newSteps = [...(lastMsg.steps || [])];
            // Find the last step for this tool that hasn't finished yet
            for (let i = newSteps.length - 1; i >= 0; i--) {
              if (newSteps[i].tool === event.data.tool && !newSteps[i].output) {
                newSteps[i] = { ...newSteps[i], output: event.data.output };
                break;
              }
            }
            lastMsg.steps = newSteps;
          } else if (event.type === 'error') {
            lastMsg.content = lastMsg.content 
              ? lastMsg.content + `\n\n> ❌ **API Error:** ${event.data}`
              : `> ❌ **API Error:** ${event.data}`;
          }

          newHistory[newHistory.length - 1] = lastMsg;
          return newHistory;
        });
      });
    } catch (error) {
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: "❌ Error: Connection failed", 
        timestamp: new Date() 
      }]);
    } finally {
      setIsBotTyping(false);
    }
  };

  return {
    chatHistory,
    chatInput,
    setChatInput,
    isBotTyping,
    handleSendMessage
  };
};
