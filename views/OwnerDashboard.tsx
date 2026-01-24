
import React, { useState, useEffect } from 'react';
import { Order, Transaction, StockEntry, MenuItem } from '../types.ts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, Users, DollarSign, Package, Sparkles, Plus, Edit2, Check, Loader2 } from 'lucide-react';
import { getBusinessInsights } from '../geminiService.ts';
import { supabase } from '../supabaseClient.ts';

interface OwnerDashboardProps {
  orders: Order[];
  transactions: Transaction[];
  stock: StockEntry[];
  menu: MenuItem[];
  setMenu: React.Dispatch<React.SetStateAction<MenuItem[]>>;
}

const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ orders, transactions, stock, menu }) => {
  const [aiInsights, setAiInsights] = useState<string>('Crunching business numbers...');
  const [isEditingMenu, setIsEditingMenu] = useState(false);
  const [updatingMenuId, setUpdatingMenuId] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      const insights = await getBusinessInsights(orders, transactions, stock);
      setAiInsights(insights || 'Insights currently being updated.');
    };
    fetchInsights();
  }, [orders, transactions, stock]);

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    setUpdatingMenuId(id);
    const { error } = await supabase
      .from('menu_items')
      .update({ isAvailable: !currentStatus })
      .eq('id', id);
    
    if (error) console.error("Menu update error:", error);
    setUpdatingMenuId(null);
  };

  const salesData = transactions
    .filter(t => t.type === 'IN')
    .slice(-10)
    .reverse()
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

  const totalRevenue = transactions.filter(t => t.type === 'IN').reduce((acc, t) => acc + Number(t.amount), 0);
  const totalCustomers = orders.length;

  return (
    <div className="space-y-8 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-7 rounded-[32px] shadow-sm border border-slate-100">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue</p>
              <p className="text-2xl font-black text-slate-800">${totalRevenue.toFixed(0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-7 rounded-[32px] shadow-sm border border-slate-100">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Users size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Covers</p>
              <p className="text-2xl font-black text-slate-800">{totalCustomers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-7 rounded-[32px] shadow-sm border border-slate-100">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Growth</p>
              <p className="text-2xl font-black text-slate-800">+12.4%</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-7 rounded-[32px] shadow-sm border border-slate-100">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl">
              <Package size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alerts</p>
              <p className="text-2xl font-black text-slate-800">2 Low</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 p-8 rounded-[48px] text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-500 rounded-xl">
              <Sparkles size={20} className="text-white" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-400">Business Intel</h3>
          </div>
          <p className="text-slate-100 leading-relaxed font-bold text-xl italic max-w-4xl">
            "{aiInsights}"
          </p>
        </div>
        <div className="absolute right-[-5%] top-[-50%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
          <h3 className="text-xl font-black mb-10 text-slate-800 flex items-center gap-2">
            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
            Revenue Stream
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#cbd5e1" fontSize={10} fontWeight="900" axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }} />
                <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorAmt)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
          <h3 className="text-xl font-black mb-10 text-slate-800 flex items-center gap-2">
            <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
            Popular Demand
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={itemPopularity} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} fontWeight="800" width={100} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '24px', border: 'none' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 12, 12, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[48px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Menu Management</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Live Cloud Configuration</p>
          </div>
          <div className="flex gap-4">
            <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10">
              <Plus size={18} />
              Add New
            </button>
            <button onClick={() => setIsEditingMenu(!isEditingMenu)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border-2 ${isEditingMenu ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-100 hover:border-slate-200'}`}>
              {isEditingMenu ? <Check size={18} /> : <Edit2 size={18} />}
              {isEditingMenu ? 'Save' : 'Edit Mode'}
            </button>
          </div>
        </div>
        
        <div className="p-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {menu.map(item => (
              <div key={item.id} className="relative bg-slate-50 p-6 rounded-[32px] border border-slate-100 hover:bg-white hover:border-indigo-100 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all">
                <div className="flex justify-between items-start mb-6">
                  <span className="px-3 py-1 bg-white border border-slate-200 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] rounded-full">
                    {item.category}
                  </span>
                  <div className={`w-3 h-3 rounded-full ${item.isAvailable ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]'}`} />
                </div>
                <h4 className="font-black text-slate-800 text-lg mb-1 leading-tight">{item.name}</h4>
                <p className="text-indigo-600 font-black mb-6 text-sm">${Number(item.price).toFixed(2)}</p>
                
                {isEditingMenu ? (
                  <div className="space-y-2 mt-4 pt-4 border-t border-slate-200/40">
                    <button 
                      disabled={updatingMenuId === item.id}
                      onClick={() => toggleAvailability(item.id, item.isAvailable)}
                      className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        item.isAvailable ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      }`}
                    >
                      {updatingMenuId === item.id ? <Loader2 size={14} className="animate-spin mx-auto" /> : item.isAvailable ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 line-clamp-2 italic font-medium">
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
