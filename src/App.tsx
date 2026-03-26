import React, { useState, useEffect } from 'react';
import GraphView from './components/graph/GraphView';
import ChatPanel from './components/chat/ChatPanel';
import EntityDetail from './components/graph/EntityDetail';
import { useStore } from './store/useStore';
import { 
  Search, 
  Bell, 
  User, 
  TrendingUp, 
  DollarSign, 
  Users, 
  CreditCard,
  MoreHorizontal,
  Plus,
  Trash2,
  Info,
  FileText,
  LayoutGrid,
  Network
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { cn } from './lib/utils';



import { useDashboardStats } from './services/api';

export default function App() {
  const { selectedNode } = useStore();
  const [view, setView] = useState<'dashboard' | 'graph'>('dashboard');
  const { data: dashboardData } = useDashboardStats();

  const chartData = dashboardData?.chartData || [];
  const pieData = dashboardData?.pieData || [];

  return (
    <div className="min-h-screen bg-background text-text flex flex-col">
      {/* View Switcher Only - No Navbar */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-border shadow-2xl flex items-center gap-1">
        <button 
          onClick={() => setView('dashboard')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
            view === 'dashboard' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted hover:text-text hover:bg-slate-100"
          )}
        >
          <LayoutGrid className="w-4 h-4" />
          Dashboard
        </button>
        <button 
          onClick={() => setView('graph')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
            view === 'graph' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted hover:text-text hover:bg-slate-100"
          )}
        >
          <Network className="w-4 h-4" />
          Graph Explorer
        </button>
      </div>

      <main className="flex-1 p-8 pt-24 space-y-8 max-w-[1600px] mx-auto w-full">
        {view === 'dashboard' ? (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
              {(dashboardData?.stats || []).map((stat: any, i: number) => (
                <div key={i} className={cn("p-4 rounded-2xl text-white shadow-lg bg-gradient-to-br", stat.color)}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-medium opacity-80">{stat.title}</span>
                      <span className="text-[8px] uppercase font-bold tracking-widest opacity-60 leading-none">{stat.sub}</span>
                    </div>
                    <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-md">{stat.change}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-xl font-bold">{stat.value}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-3 bg-white p-8 rounded-[2.5rem] shadow-sm border border-border">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="font-bold text-lg">Billing Trend</h3>
                  <div className="flex gap-2">
                    {['1D', '5D', '1M', '6M', '1Y', 'Max'].map(t => (
                      <button key={t} className={cn("px-3 py-1 text-[10px] font-bold rounded-lg transition-all", t === '1M' ? "text-primary bg-primary/10" : "text-muted hover:text-text")}>{t}</button>
                    ))}
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="value" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-border flex flex-col">
                <h3 className="font-bold text-lg mb-8">Partner Categories</h3>
                <div className="flex-1 flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-bold">{pieData.length}</span>
                    <span className="text-[10px] text-muted font-bold uppercase">Categories</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-8 overflow-y-auto max-h-[120px] pr-2">
                  {(pieData || []).map((item: any) => (
                    <div key={item.name} className="flex flex-col items-start gap-1">
                      <span className="text-sm font-bold">{item.value}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.color }} />
                        <span className="text-[10px] text-muted font-bold truncate max-w-[100px]">{item.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Performers Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-border">
                <h3 className="font-bold text-lg mb-6">Top Customers by Billing</h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {(dashboardData?.topCustomers || []).map((customer: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {i + 1}
                        </div>
                        <span className="font-bold text-sm truncate max-w-[180px]">{customer.name}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-primary">${(customer.value / 1000).toFixed(1)}k</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-border">
                <h3 className="font-bold text-lg mb-6">Top Products by Sales</h3>
                <div className="space-y-4">
                  {(dashboardData?.topProducts || []).map((product: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs">
                          {i + 1}
                        </div>
                        <span className="font-bold text-sm truncate max-w-[200px]">{product.name}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-emerald-600">${(product.value / 1000).toFixed(1)}k</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-border">
                <h3 className="font-bold text-lg mb-6">Recent Activities</h3>
                <div className="space-y-6">
                  {(dashboardData?.recentActivities || []).map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", item.color)}>
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{item.title}</span>
                        <span className="text-[10px] text-muted">{item.sub}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-border">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg">Sales Order Status</h3>
                  <div className="flex gap-2">
                    <button className="p-2 bg-primary text-white rounded-lg"><Plus className="w-4 h-4" /></button>
                    <button className="p-2 bg-slate-100 text-muted rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    <button className="p-2 bg-slate-100 text-muted rounded-lg"><Info className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted border-b border-border">
                        <th className="text-left pb-4 font-bold uppercase text-[10px] tracking-widest">Order ID</th>
                        <th className="text-left pb-4 font-bold uppercase text-[10px] tracking-widest">Customer</th>
                        <th className="text-left pb-4 font-bold uppercase text-[10px] tracking-widest">Net Amount</th>
                        <th className="text-left pb-4 font-bold uppercase text-[10px] tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(dashboardData?.orderStatus || []).map((row: any, i: number) => (
                        <tr key={i} className="border-b border-slate-50 last:border-0">
                          <td className="py-4 font-medium">{row.id}</td>
                          <td className="py-4">{row.customer}</td>
                          <td className="py-4 font-bold">${(row.price / 1000).toFixed(1)}k</td>
                          <td className="py-4">
                            <span className={cn("px-3 py-1 rounded-lg text-[10px] font-bold text-white", row.color)}>{row.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-[calc(100vh-120px)] w-full relative -mx-8 -mb-8">
            <GraphView />
            <EntityDetail />
          </div>
        )}
      </main>

      {/* Floating Chat Interface */}
      <ChatPanel />
    </div>
  );
}
