
import type React from 'react';

export type Source = {
  id: string;
  type: 'pdf' | 'web';
  title: string;
  summary: string;
  url?: string;
};

export type ChatMessage = {
  sender: 'user' | 'ogeemo';
  text: React.ReactNode;
};

// Mock data for sources
export const mockSources: Source[] = [
  { id: 'src-1', type: 'pdf', title: 'Q3_Market_Analysis.pdf', summary: 'Analysis of market trends and competitor performance for the third quarter.' },
  { id: 'src-2', type: 'web', title: 'TechCrunch Article on AI Startups', url: 'https://techcrunch.com/2024/01/01/ai-startups-2024/', summary: 'An overview of the most promising Ogeemo startups to watch this year.' },
  { id: 'src-3', type: 'pdf', title: 'Project_Phoenix_Brief.pdf', summary: 'Initial project brief outlining goals, scope, and key deliverables for Project Phoenix.' },
];

// Mock data for Ogeemo Chat
export const initialChatMessages: ChatMessage[] = [
  { sender: 'ogeemo', text: 'Hi! I am your Ogeemo research assistant. Ask me anything about your sources, or select one to get a summary.' },
];
