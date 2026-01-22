
import React, { useState, useEffect } from 'react';
import { Order, Transaction, StockEntry, MenuItem } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, Users, DollarSign, Package, Sparkles, Plus, Edit2, Check } from 'lucide-react';
import { getBusinessInsights } from '../geminiService';

interface OwnerDashboardProps {
  orders: Order[];
  transactions: Transaction[];
  stock: StockEntry[];
  menu: MenuItem[];
  setMenu: React.Dispatch<React.SetStateAction<MenuItem[]>>;
}

const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ orders, transactions, stock, menu, setMenu }) => {
  const [aiInsights, setAiInsights] = useState<string>('Analyzing business data...');
  const [isEditingMenu, setIsEditingMenu] = useState(false);

  useEffect(() => {
    const fetchInsights = async () => {
      const insights = await getBusinessInsights(orders, transactions, stock);
      setAiInsights(insights || 'No insights available.');
    };
    fetchInsights();
  }, [orders, transactions, stock]);

  const toggleAvailability = (id: string) => {
    setMenu(prev => prev.map(m => m.id === id ? { ...m, isAvailable: !m.isAvailable } : m));
  };

  // Aggregated Data for Charts
  const salesData = transactions
    .filter(t => t.type === 'IN')
    .slice(-10)
    .map(t => ({ 
      time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
      amount: t.amount 
    }));

  const itemPopularity = menu.map(m => {
    const count = orders.reduce((acc, o) => 
      acc + o.items.filter(i => i.menuItemId === m.id).reduce((s, it) => s + it.quantity, 0)
    , 0);
    return { name: m.name, count };
  }).sort((a, b) => b.count - a.count).slice(0, 5);

  const totalRevenue = transactions.filter(t => t.type === 'IN').reduce((acc, t) => acc + t.amount, 0);
  const totalCustomers = orders.length;

  return (
    <div className="space-y-8 pb-12">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Revenue</p>
              <p className="text-2xl font-black text-slate-800">${totalRevenue.toFixed(0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Orders</p>
              <p className="text-2xl font-black text-slate-800">{totalCustomers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Sales Trend</p>
              <p className="text-2xl font-black text-slate-800">+12%</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <Package size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Stock Alerts</p>
              <p className="text-2xl font-black text-slate-800">2 Low</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights Bar */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-700 p-8 rounded-[40px] text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden group">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <Sparkles size={20} className="text-indigo-100" />
            </div>
            <h3 className="text-lg font-bold tracking-tight">Gemini Intelligence Hub</h3>
          </div>
          <p className="text-indigo-50 leading-relaxed font-medium text-lg max-w-3xl italic">
            "{aiInsights}"
          </p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform group-hover:scale-110 transition-transform duration-700">
          <Sparkles size={240} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales Chart */}
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold mb-8 text-slate-800">Recent Revenue Flow</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAmt)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Popular Items Chart */}
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold mb-8 text-slate-800">Top Selling Items</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={itemPopularity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={120} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#4f46e5" radius={[0, 8, 8, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Menu Management Section */}
      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-2xl font-bold text-slate-800">Menu Management</h3>
            <p className="text-slate-500 text-sm mt-1">Real-time updates across all staff screens</p>
          </div>
          <div className="flex gap-4">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl font-bold shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all">
              <Plus size={18} />
              Add Item
            </button>
            <button 
              onClick={() => setIsEditingMenu(!isEditingMenu)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold transition-all border-2 ${
                isEditingMenu ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/20' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {isEditingMenu ? <Check size={18} /> : <Edit2 size={18} />}
              {isEditingMenu ? 'Done' : 'Edit Mode'}
            </button>
          </div>
        </div>
        
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {menu.map(item => (
              <div key={item.id} className="group relative bg-slate-50 p-5 rounded-3xl border border-slate-100 hover:border-indigo-200 hover:bg-white transition-all duration-300">
                <div className="flex justify-between items-start mb-3">
                  <span className="px-3 py-1 bg-white border border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest rounded-full">
                    {item.category}
                  </span>
                  <div className={`w-3 h-3 rounded-full ${item.isAvailable ? 'bg-emerald-500 ring-4 ring-emerald-50' : 'bg-rose-500 ring-4 ring-rose-50'}`} />
                </div>
                <h4 className="font-bold text-slate-800 text-lg mb-1">{item.name}</h4>
                <p className="text-slate-400 text-sm font-bold mb-4">${item.price.toFixed(2)}</p>
                
                {isEditingMenu ? (
                  <div className="space-y-2 mt-4 pt-4 border-t border-slate-200/50 animate-in fade-in slide-in-from-top-2 duration-300">
                    <button 
                      onClick={() => toggleAvailability(item.id)}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                        item.isAvailable 
                          ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' 
                          : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      }`}
                    >
                      {item.isAvailable ? 'Mark Unavailable' : 'Mark Available'}
                    </button>
                    <button className="w-full py-2.5 bg-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-300">
                      Update Details
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 line-clamp-2 italic">
                    {item.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
