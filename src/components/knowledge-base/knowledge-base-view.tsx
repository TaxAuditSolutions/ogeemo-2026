'use client';

import * as React from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { isInternalPath } from '@/lib/ai-input';
import remarkGfm from 'remark-gfm';
import { BookOpen, ExternalLink, LoaderCircle, RotateCcw, Send, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface Citation { id: string; title: string; module: string; route?: string }
interface ChatMessage { id: string; role: 'user' | 'assistant'; content: string; citations?: Citation[] }

const WELCOME: ChatMessage = {
  id: 'welcome', role: 'assistant',
  content: 'Ask me how Ogeemo works. I’ll retrieve the relevant instructions and cite their sources. It currently covers the **Activity Manager**, **Calendar**, **Contacts**, **Projects**, **Workflows**, **Time Tracking and Reports**, and **sidebar navigation**.',
};
const SUGGESTED_QUESTIONS = [
  'How does Next free slot choose a time?',
  'How do I switch the sidebar to Favorites?',
  'Why did my unfinished calendar item turn amber?',
  'What is the difference between Save and Save & New?',
  'How do I add a contact?',
  'Which time can be billed?',
  'How do I log time after the fact?',
];

export function KnowledgeBaseView() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = React.useState('');
  const [isThinking, setIsThinking] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, isThinking]);

  const ask = async (question: string) => {
    const message = question.trim();
    if (!message || isThinking) return;
    const history = messages.filter((item) => item.id !== 'welcome').map((item) => ({ role: item.role, content: item.content }));
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', content: message }]);
    setInput('');
    setIsThinking(true);
    try {
      const response = await fetch('/api/knowledge-base/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history, currentPath: '/knowledge-base' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The Knowledge Base could not answer.');
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', content: data.reply, citations: data.citations }]);
    } catch (error: any) {
      setMessages((current) => [...current, { id: `error-${Date.now()}`, role: 'assistant', content: `**I couldn’t complete that request.** ${error?.message ?? 'Please try again.'}` }]);
    } finally { setIsThinking(false); }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-4 overflow-y-auto p-4 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold font-headline text-primary">Ogeemo Knowledge Base</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Source-backed answers about how Ogeemo works.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setMessages([WELCOME]); setInput(''); }} disabled={isThinking}>
            <RotateCcw className="mr-2 h-4 w-4" /> New conversation
          </Button>
          <Button asChild variant="ghost" size="sm"><Link href="/co-pilot">Operational Co-Pilot <ExternalLink className="ml-2 h-3.5 w-3.5" /></Link></Button>
        </div>
      </header>
      <div className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>Read-only. It does not change records or inspect private account data. Unsupported questions receive an honest “not documented” response.</p>
      </div>
      <Card className="flex min-h-[540px] flex-1 flex-col shadow-md">
        <CardHeader className="border-b py-4">
          <CardTitle className="text-base">Ask Ogeemo</CardTitle>
          <CardDescription>Only a few relevant knowledge entries are used for each answer.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          {messages.map((message) => (
            <article key={message.id} className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[88%] rounded-lg px-4 py-3 text-sm', message.role === 'user' ? 'bg-primary text-primary-foreground' : 'border bg-card')}>
                <div className="prose prose-sm max-w-none dark:prose-invert [&_a]:text-primary [&_a]:underline [&_p]:mb-3 [&_p:last-child]:mb-0">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={(url) => (isInternalPath(url) ? url : '')}>{message.content}</ReactMarkdown>
                </div>
                {message.citations && message.citations.length > 0 && (
                  <div className="mt-3 border-t pt-3">
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">Sources used</p>
                    <div className="flex flex-wrap gap-2">
                      {message.citations.map((citation) => citation.route ? (
                        <Button key={citation.id} asChild variant="outline" size="sm" className="h-auto max-w-full px-2 py-1 text-left text-xs">
                          <Link href={citation.route} title={`${citation.module}: ${citation.title}`}><span className="truncate">{citation.title}</span></Link>
                        </Button>
                      ) : <Badge key={citation.id} variant="outline" className="max-w-full text-xs">{citation.title}</Badge>)}
                    </div>
                  </div>
                )}
              </div>
            </article>
          ))}
          {messages.length === 1 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {SUGGESTED_QUESTIONS.map((question) => (
                <Button key={question} variant="outline" className="h-auto justify-start whitespace-normal px-3 py-2 text-left text-xs" onClick={() => void ask(question)}>{question}</Button>
              ))}
            </div>
          )}
          {isThinking && <div className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" /> Retrieving documentation and preparing an answer…</div>}
          <div ref={endRef} />
        </CardContent>
        <div className="border-t p-4">
          <form onSubmit={(event) => { event.preventDefault(); void ask(input); }} className="flex items-end gap-2">
            <Textarea value={input} onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void ask(input); } }}
              placeholder="Ask how an Ogeemo feature works…" aria-label="Ask the Knowledge Base"
              rows={2} maxLength={2000} disabled={isThinking} className="min-h-[52px] resize-none" />
            <Button type="submit" disabled={isThinking || !input.trim()} className="h-[52px]">
              {isThinking ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}<span className="sr-only">Send question</span>
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">Enter to send · Shift+Enter for a new line</p>
        </div>
      </Card>
    </div>
  );
}
