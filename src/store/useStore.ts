import { create } from 'zustand';
import { Node } from 'reactflow';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  results?: any[];
  timestamp: number;
}

interface AppState {
  selectedNode: Node | null;
  chatHistory: Message[];
  isSidebarCollapsed: boolean;
  highlightedNodes: string[];
  
  setSelectedNode: (node: Node | null) => void;
  addMessage: (msg: Message) => void;
  setHighlightedNodes: (ids: string[]) => void;
  toggleSidebar: () => void;
  clearHistory: () => void;
}

export const useStore = create<AppState>((set) => ({
  selectedNode: null,
  chatHistory: [
    { 
      role: 'assistant', 
      content: 'Hello! I am your Business Context Explorer. Ask me anything about your enterprise data.',
      timestamp: Date.now()
    }
  ],
  isSidebarCollapsed: false,
  highlightedNodes: [],

  setSelectedNode: (node) => set({ selectedNode: node }),
  addMessage: (msg) => set((state) => ({ chatHistory: [...state.chatHistory, msg] })),
  setHighlightedNodes: (ids) => set({ highlightedNodes: ids }),
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  clearHistory: () => set({ chatHistory: [] }),
}));
