import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Database, Info } from 'lucide-react';
import { generateSQL, explainResults } from '../services/gemini';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  results?: any[];
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your Business Context Explorer. Ask me anything about your enterprise data.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [schema, setSchema] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/schema')
      .then(res => res.json())
      .then(setSchema);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !schema) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // 1. Generate SQL
      const sql = await generateSQL(input, schema);
      
      if (sql.startsWith('ERROR:')) {
        setMessages(prev => [...prev, { role: 'assistant', content: sql }]);
        setIsLoading(false);
        return;
      }

      // 2. Execute SQL
      const response = await fetch('/api/query-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      });
      const results = await response.json();

      if (results.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `SQL Error: ${results.error}`, sql }]);
        setIsLoading(false);
        return;
      }

      // 3. Explain Results
      const explanation = await explainResults(input, results);
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: explanation, 
        sql, 
        results: results.slice(0, 5) // Show first 5 in UI
      }]);
    } catch (error) {
      console.error('Error in query:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error processing your request.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 shadow-xl">
      <div className="p-4 border-bottom border-slate-100 flex items-center gap-2 bg-slate-50">
        <Bot className="w-6 h-6 text-blue-600" />
        <h2 className="font-bold text-slate-800">Business AI Assistant</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] p-3 rounded-2xl ${
                m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-slate-100 text-slate-800 rounded-tl-none'
              }`}>
                <div className="flex items-start gap-2">
                  {m.role === 'assistant' && <Bot className="w-4 h-4 mt-1 opacity-50" />}
                  <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                </div>
                
                {m.sql && (
                  <div className="mt-3 p-2 bg-slate-800 rounded text-xs font-mono text-blue-300 overflow-x-auto">
                    <div className="flex items-center gap-1 mb-1 opacity-50">
                      <Database className="w-3 h-3" />
                      <span>Generated SQL</span>
                    </div>
                    {m.sql}
                  </div>
                )}

                {m.results && m.results.length > 0 && (
                  <div className="mt-3 bg-white rounded border border-slate-200 overflow-hidden">
                    <div className="p-1 px-2 bg-slate-50 text-[10px] uppercase tracking-wider font-bold text-slate-500 border-b">
                      Sample Results
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="bg-slate-50">
                            {Object.keys(m.results[0]).map(k => (
                              <th key={k} className="p-1 text-left border-r last:border-0">{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {m.results.map((row, ri) => (
                            <tr key={ri} className="border-t">
                              {Object.values(row).map((v: any, vi) => (
                                <td key={vi} className="p-1 border-r last:border-0">{String(v)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm text-slate-500 italic">Analyzing enterprise data...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-100">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about billing, customers, or payments..."
            className="w-full p-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
          <Info className="w-3 h-3" />
          <span>Try: "Show me top 5 customers by billing" or "Find unpaid invoices"</span>
        </div>
      </div>
    </div>
  );
}
