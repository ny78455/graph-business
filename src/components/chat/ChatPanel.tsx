import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  Loader2, 
  Database, 
  Sparkles,
  Trash2,
  MessageSquare,
  X,
  Minus
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateSQL, explainResults } from '../../services/gemini';
import { useStore, Message } from '../../store/useStore';
import { useSchema, useExecuteSQL } from '../../services/api';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export default function ChatPanel() {
  const { chatHistory, addMessage, clearHistory, setHighlightedNodes } = useStore();
  const { data: schema } = useSchema();
  const executeSQL = useExecuteSQL();
  
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQueries = [
    "Top 5 products by billing",
    "Find unpaid invoices",
    "Trace order lifecycle for 800001"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [chatHistory, isTyping, isOpen]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || !schema) return;

    const userMessage: Message = { 
      role: 'user', 
      content: text, 
      timestamp: Date.now() 
    };
    addMessage(userMessage);
    setInput('');
    setIsTyping(true);

    try {
      const sql = await generateSQL(text, schema);
      
      if (sql.startsWith('ERROR:')) {
        addMessage({ role: 'assistant', content: sql, timestamp: Date.now() });
        setIsTyping(false);
        return;
      }

      const results = await executeSQL.mutateAsync(sql);

      if (text.toLowerCase().includes('trace') || text.toLowerCase().includes('invoice')) {
        const ids = results.map((r: any) => {
          if (r.BillingDocument) return [`H_${r.BillingDocument}`, `J_${r.JournalEntry}`, `C_${r.Customer}`];
          return [];
        }).flat().filter(Boolean);
        setHighlightedNodes(ids);
      } else {
        setHighlightedNodes([]);
      }

      const explanation = await explainResults(text, results);
      
      addMessage({ 
        role: 'assistant', 
        content: explanation, 
        sql, 
        results: results.slice(0, 5),
        timestamp: Date.now()
      });
    } catch (error: any) {
      console.error('Error in query:', error);
      addMessage({ 
        role: 'assistant', 
        content: `Error: ${error.message || 'Failed to process request'}`, 
        timestamp: Date.now() 
      });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>

      {/* Chat Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-[400px] h-[600px] bg-card border border-border rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-primary/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-sm">AI Assistant</h2>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                    <span className="text-[10px] text-accent font-bold uppercase">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={clearHistory} className="p-2 hover:bg-border rounded-lg text-muted hover:text-danger">
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-border rounded-lg text-muted">
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.map((m, i) => (
                <div key={i} className={cn("flex flex-col gap-1", m.role === 'user' ? 'items-end' : 'items-start')}>
                  <div className={cn(
                    "max-w-[85%] p-3 rounded-2xl text-sm shadow-sm",
                    m.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'
                  )}>
                    <div className="markdown-body">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                    
                    {m.sql && (
                      <div className="mt-2 p-2 bg-slate-800 rounded-lg font-mono text-[10px] text-blue-300 overflow-x-auto">
                        <div className="flex items-center gap-1 mb-1 opacity-50">
                          <Database className="w-3 h-3" />
                          <span>SQL</span>
                        </div>
                        {m.sql}
                      </div>
                    )}

                    {m.results && m.results.length > 0 && (
                      <div className="mt-2 bg-white rounded-lg border border-border overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-[10px]">
                            <thead>
                              <tr className="bg-slate-50">
                                {Object.keys(m.results[0]).map(k => (
                                  <th key={k} className="p-1.5 text-left border-r border-border last:border-0 font-bold text-muted uppercase tracking-wider">{k}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {m.results.map((row, ri) => (
                                <tr key={ri} className="border-t border-border">
                                  {Object.values(row).map((v: any, vi) => (
                                    <td key={vi} className="p-1.5 border-r border-border last:border-0 text-slate-700">{String(v)}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-muted px-1">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    <span className="text-xs text-muted italic">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Queries */}
            <div className="p-3 border-t border-border bg-slate-50">
              <div className="flex items-center gap-1.5 mb-2 text-[10px] font-bold uppercase text-muted">
                <Sparkles className="w-3 h-3 text-primary" />
                <span>Suggestions</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestedQueries.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    className="px-2 py-1 bg-white border border-border rounded-lg text-[10px] font-medium text-slate-700 hover:bg-primary hover:text-white hover:border-primary transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-white">
              <div className="relative flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about your business..."
                  className="w-full p-3 pr-12 bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={isTyping || !input.trim()}
                  className="absolute right-1.5 p-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
