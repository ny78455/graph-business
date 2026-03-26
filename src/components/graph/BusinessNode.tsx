import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion } from 'motion/react';
import { 
  FileText, 
  Truck, 
  Receipt, 
  CreditCard, 
  Users,
  ChevronRight,
  BarChart3,
  Package,
  ShoppingCart
} from 'lucide-react';
import { cn } from '../../lib/utils';

const nodeConfig: Record<string, { icon: any, color: string, bg: string, border: string }> = {
  sales_order: { icon: ShoppingCart, color: '#10B981', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  order: { icon: FileText, color: '#6366F1', bg: 'bg-indigo-50', border: 'border-indigo-100' },
  delivery: { icon: Truck, color: '#F59E0B', bg: 'bg-amber-50', border: 'border-amber-100' },
  invoice: { icon: Receipt, color: '#A855F7', bg: 'bg-purple-50', border: 'border-purple-100' },
  payment: { icon: CreditCard, color: '#22C55E', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  customer: { icon: Users, color: '#F97316', bg: 'bg-orange-50', border: 'border-orange-100' },
  header: { icon: FileText, color: '#6366F1', bg: 'bg-indigo-50', border: 'border-indigo-100' },
  item: { icon: BarChart3, color: '#F59E0B', bg: 'bg-amber-50', border: 'border-amber-100' },
  product: { icon: Package, color: '#8B5CF6', bg: 'bg-violet-50', border: 'border-violet-100' },
};

const BusinessNode = ({ data, selected }: NodeProps) => {
  const config = nodeConfig[data.type] || nodeConfig.order;
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center group">
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-slate-300 border-2 border-white !-top-1 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className={cn(
        "w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-500 relative",
        config.bg,
        config.border,
        selected ? "ring-4 ring-primary/20 scale-110 border-primary shadow-xl" : "shadow-sm hover:shadow-lg hover:scale-110"
      )}>
        <Icon className="w-6 h-6" style={{ color: config.color }} strokeWidth={2} />
        
        {selected && (
          <motion.div 
            layoutId="active-ring"
            className="absolute -inset-2 rounded-full border-2 border-primary/30 animate-ping"
          />
        )}
      </div>

      <div className={cn(
        "mt-2 px-3 py-1 rounded-full bg-white/80 backdrop-blur-sm border border-slate-100 shadow-sm transition-all duration-300",
        selected ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
      )}>
        <span className="text-[10px] font-bold text-slate-700 whitespace-nowrap">{data.label || data.id}</span>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-slate-300 border-2 border-white !-bottom-1 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

export default memo(BusinessNode);
