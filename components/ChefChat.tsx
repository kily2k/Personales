import React, { useState, useRef, useEffect } from 'react';
import { Send, ChefHat, Bot, User, Sparkles } from 'lucide-react';
import { getChefResponse } from '../services/geminiService';
import { ChatMessage } from '../types';

export const ChefChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: '¡Bonjour! Soy Chef Pierre. ¿En qué puedo ayudarte hoy? ¿Necesitas una nueva receta de macarons o consejos para tu masa madre?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await getChefResponse(messages, userMsg.text);
      const modelMsg: ChatMessage = { role: 'model', text: responseText || "Lo siento, tuve un problema pensando.", timestamp: new Date() };
      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] md:h-[calc(100vh-3rem)] max-w-4xl mx-auto bg-white rounded-3xl shadow-lg border border-rose-100 overflow-hidden">
      {/* Header */}
      <div className="bg-rose-500 p-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full">
            <ChefHat size={24} />
          </div>
          <div>
            <h2 className="font-bold text-lg">Chef Pierre AI</h2>
            <p className="text-xs text-rose-100 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              En línea
            </p>
          </div>
        </div>
        <Sparkles className="text-yellow-300 opacity-75" />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-indigo-600' : 'bg-rose-500'
            }`}>
              {msg.role === 'user' ? <User size={20} className="text-white" /> : <Bot size={20} className="text-white" />}
            </div>
            <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
            }`}>
              <div className="whitespace-pre-wrap leading-relaxed text-sm">
                {msg.text}
              </div>
              <p className={`text-[10px] mt-2 text-right ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm ml-14">
            <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce delay-200"></div>
            Chef Pierre está escribiendo...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="flex items-center gap-2 bg-slate-50 rounded-full px-4 py-2 border border-slate-200 focus-within:border-rose-300 focus-within:ring-2 focus-within:ring-rose-100 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Pregunta sobre recetas, técnicas o inventario..."
            className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 rounded-full text-white transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};