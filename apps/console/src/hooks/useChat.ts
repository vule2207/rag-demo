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
      const data = await ragService.chat(chatInput);
      const botMsg: Message = { 
        role: 'assistant', 
        content: data.answer, 
        timestamp: new Date(),
        steps: data.steps 
      };
      setChatHistory(prev => [...prev, botMsg]);
    } catch (error) {
      const errMsg: Message = { 
        role: 'assistant', 
        content: "❌ Error: Connection failed", 
        timestamp: new Date() 
      };
      setChatHistory(prev => [...prev, errMsg]);
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
