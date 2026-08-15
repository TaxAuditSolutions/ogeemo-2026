'use client';

import React, { useState } from 'react';
import { askSandboxAgent } from '@/ai/flows/sandbox-agent-flow';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export default function SandboxAgentPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<{ role: 'user' | 'agent', content: string }[]>([
    { role: 'agent', content: 'Hello! I am the Ogeemo Sandbox Agent. Ask me anything about Ogeemo\'s features!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await askSandboxAgent({
        prompt: userMessage,
        clientUserId: user?.uid,
      });

      if (response.error) {
        setMessages(prev => [...prev, { role: 'agent', content: `Error: ${response.error}` }]);
      } else if (response.answer) {
        setMessages(prev => [...prev, { role: 'agent', content: response.answer || 'No response.' }]);
      } else {
        setMessages(prev => [...prev, { role: 'agent', content: 'Sorry, I did not understand that.' }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'agent', content: 'An unexpected error occurred.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-4xl mx-auto p-4 md:p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
          <Bot className="w-6 h-6 text-blue-600 dark:text-blue-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Ogeemo Sandbox Agent</h1>
          <p className="text-sm text-muted-foreground">Test the AI Dispatch feature knowledge base</p>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-zinc-900 border rounded-xl shadow-sm flex flex-col overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-[80%] space-x-2 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`p-3 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                    : 'bg-muted rounded-tl-sm prose dark:prose-invert max-w-none text-sm'
                }`}>
                  {/* Simple text rendering. In a real app we might use react-markdown here */}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex max-w-[80%] space-x-2">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Bot size={16} />
                </div>
                <div className="p-3 bg-muted rounded-2xl rounded-tl-sm flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t bg-muted/30">
          <form onSubmit={handleSubmit} className="flex space-x-2 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about Ogeemo features..."
              className="flex-1 px-4 py-3 rounded-full border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-primary text-primary-foreground p-3 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center aspect-square"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
