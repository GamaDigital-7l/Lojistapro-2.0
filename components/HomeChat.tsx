import React, { useState, useRef, useEffect } from 'react';
import { Send, Zap } from 'lucide-react';
import { processAICommand, ChatResponse } from '../services/geminiService';
import { useAppContext } from '../AppContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const HomeChat: React.FC = () => {
  const { tecnicos, handleAIAction, settings } = useAppContext();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{ role: 'assistant', content: 'Olá! Sou seu assistente Lojista Pro. Como posso ajudar?' }]);
  }, []);


  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setIsTyping(true);

    try {
      const result = await Promise.race([
        processAICommand(userMsg, { tecnicos, history: [], apiKey: settings.gemini_api_key }),
        new Promise<ChatResponse>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 15000) // 15 segundos de timeout
        )
      ]);

      let assistantMessage = result.message;
      if (!assistantMessage && result.action === 'CREATE_OS') {
        assistantMessage = `Ação para criar a OS #${result.data?.id} recebida. Processando...`;
      }

      if (assistantMessage) {
        setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
      }
      
      if (result.action && result.action !== 'UNKNOWN' && result.action !== 'NEED_INFO') {
        handleAIAction(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error && error.message === 'timeout' 
        ? 'A resposta demorou muito. Verifique sua conexão ou tente novamente mais tarde.'
        : 'Ocorreu um erro ao processar sua mensagem.';
      setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Área de Mensagens - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] px-4 py-2.5 rounded-2xl text-[13px] font-medium shadow-md ${
              msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-200 border border-slate-800'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-2xl flex gap-1 items-center">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      {/* Input - Colado ao Teclado */}
      <div className="px-4 py-3 lg:pb-8 bg-slate-950 border-t border-slate-900">
        <div className={`bg-slate-900 border border-slate-800 rounded-full flex items-center p-1 shadow-2xl focus-within:border-blue-600/50 transition-all`}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Mande sua mensagem aqui..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-slate-200 px-4 py-2 text-sm"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white active:scale-90 transition-all disabled:opacity-30"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};