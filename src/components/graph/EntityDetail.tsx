import React, { useState } from 'react';
import { 
  X, 
  Database, 
  Network, 
  ArrowRight, 
  ExternalLink, 
  Clock, 
  Tag, 
  Info,
  ChevronRight,
  Activity,
  History,
  ShoppingCart,
  Truck,
  Receipt,
  CreditCard,
  Users,
  Package,
  FileText,
  Code,
  CheckCircle2
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useGraphData } from '../../services/api';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

const typeConfig: Record<string, { icon: any, color: string, bg: string }> = {
  sales_order: { icon: ShoppingCart, color: 'text-emerald-500', bg: 'bg-emerald-500/20' },
  order: { icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-500/20' },
  delivery: { icon: Truck, color: 'text-amber-500', bg: 'bg-amber-500/20' },
  invoice: { icon: Receipt, color: 'text-purple-500', bg: 'bg-purple-500/20' },
  payment: { icon: CreditCard, color: 'text-emerald-500', bg: 'bg-emerald-500/20' },
  customer: { icon: Users, color: 'text-orange-500', bg: 'bg-orange-500/20' },
  product: { icon: Package, color: 'text-violet-500', bg: 'bg-violet-500/20' },
  item: { icon: Tag, color: 'text-amber-500', bg: 'bg-amber-500/20' },
};

export default function EntityDetail() {
  const { selectedNode, setSelectedNode, setHighlightedNodes, highlightedNodes } = useStore();
  const { data: graphData } = useGraphData();
  const [showRaw, setShowRaw] = useState(false);

  if (!selectedNode) return null;

  const data = selectedNode.data;
  const config = typeConfig[data.type] || { icon: Database, color: 'text-slate-500', bg: 'bg-slate-500/20' };
  const Icon = config.icon;

  // Extract metadata, excluding internal React Flow properties
  const metadata = Object.entries(data).reduce((acc, [key, value]) => {
    if (!['type', 'label'].includes(key)) {
      acc[key] = value;
    }
    return acc;
  }, {} as any);

  const handleTrace = () => {
    if (!graphData || !selectedNode) return;
    
    const visited = new Set<string>();
    const queue = [selectedNode.id];
    visited.add(selectedNode.id);

    // BFS to find all connected nodes (undirected for trace)
    let head = 0;
    while (head < queue.length) {
      const currentId = queue[head++];
      graphData.edges.forEach((edge: any) => {
        if (edge.source === currentId && !visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push(edge.target);
        } else if (edge.target === currentId && !visited.has(edge.source)) {
          visited.add(edge.source);
          queue.push(edge.source);
        }
      });
    }
    
    setHighlightedNodes(Array.from(visited));
  };

  const handleNeighbors = () => {
    if (!graphData || !selectedNode) return;
    
    const neighbors = new Set<string>();
    neighbors.add(selectedNode.id);
    
    graphData.edges.forEach((edge: any) => {
      if (edge.source === selectedNode.id) neighbors.add(edge.target);
      if (edge.target === selectedNode.id) neighbors.add(edge.source);
    });
    
    setHighlightedNodes(Array.from(neighbors));
  };

  const clearHighlights = () => {
    setHighlightedNodes([]);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute right-0 top-0 h-full w-[450px] bg-white/95 backdrop-blur-xl border-l border-slate-200 shadow-2xl z-40 flex flex-col"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white/50">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-110 duration-300",
              config.bg,
              config.color
            )}>
              <Icon className="w-7 h-7" />
            </div>
            <div className="flex flex-col">
              <h2 className="font-bold text-xl text-slate-900 tracking-tight leading-tight">{data.label || selectedNode.id}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">{data.type}</span>
                <div className="w-1 h-1 bg-slate-200 rounded-full" />
                <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Live Context</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {highlightedNodes.length > 0 && (
              <button 
                onClick={clearHighlights}
                className="p-2 text-[10px] font-bold text-primary hover:bg-primary/5 rounded-lg transition-all uppercase tracking-widest"
              >
                Clear Focus
              </button>
            )}
            <button 
              onClick={() => setSelectedNode(null)}
              className="p-2.5 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          {/* Metadata Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <Info className="w-3.5 h-3.5 text-primary" />
                <span>Entity Properties</span>
              </div>
              <button 
                onClick={() => setShowRaw(!showRaw)}
                className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-primary transition-all uppercase tracking-widest"
              >
                <Code className="w-3 h-3" />
                {showRaw ? 'Hide JSON' : 'Show JSON'}
              </button>
            </div>
            
            {showRaw ? (
              <div className="p-4 bg-slate-900 rounded-2xl overflow-x-auto">
                <pre className="text-[11px] text-emerald-400 font-mono leading-relaxed">
                  {JSON.stringify(metadata, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {Object.entries(metadata).map(([key, value]) => (
                  <div key={key} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl flex flex-col gap-1.5 group hover:border-primary/30 hover:bg-white hover:shadow-sm transition-all duration-300">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider group-hover:text-primary/70 transition-all">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="text-sm font-semibold text-slate-800 break-words leading-relaxed">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Activity Timeline */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <History className="w-3.5 h-3.5 text-indigo-500" />
              <span>Business Lifecycle</span>
            </div>
            <div className="relative pl-6 border-l-2 border-slate-100 space-y-8 ml-2">
              {[
                { label: 'Data Ingested', time: '2 hours ago', status: 'completed', desc: 'Successfully processed from source' },
                { label: 'Graph Linked', time: '1 hour ago', status: 'completed', desc: 'Relationships established' },
                { label: 'Active in Context', time: 'Just now', status: 'active', desc: 'Available for exploration' },
              ].map((item, i) => (
                <div key={i} className="relative">
                  <div className={cn(
                    "absolute -left-[33px] top-1 w-4 h-4 rounded-full border-4 border-white shadow-sm",
                    item.status === 'completed' ? 'bg-emerald-500' : 'bg-primary animate-pulse'
                  )} />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-slate-800">{item.label}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{item.time}</span>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-slate-100 bg-slate-50/30 space-y-4">
          <button 
            onClick={handleTrace}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 group"
          >
            <Activity className="w-4 h-4 group-hover:animate-pulse text-emerald-400" />
            Trace Full Business Flow
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setShowRaw(true)}
              className="py-3.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Source
            </button>
            <button 
              onClick={handleNeighbors}
              className="py-3.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <Network className="w-3.5 h-3.5" />
              Neighbors
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
