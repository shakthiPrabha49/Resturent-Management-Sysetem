
import React, { useState, useEffect } from 'react';
import { Order, Transaction, StockEntry, MenuItem } from '../types.ts';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, BarChart, Bar, YAxis } from 'recharts';
import { TrendingUp, Users, DollarSign, Package, Sparkles, Edit2, Check, Loader2, Hash } from 'lucide-react';
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
  const [aiInsights, setAiInsights] = useState<string>('Analyzing business...');
  const [isEditingMenu, setIsEditingMenu] = useState(false);
  const [updatingMenuId, setUpdatingMenuId] = useState<string | null>(null);
  const [editingItemNumbers, setEditingItemNumbers] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchInsights = async () => {
      const insights = await getBusinessInsights(orders, transactions, stock);
      setAiInsights(insights || 'No insights available.');
    };
    fetchInsights();
  }, [orders, transactions, stock]);

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    setUpdatingMenuId(id);
    await supabase.from('menu_items').update({ is_available: !currentStatus }).eq('id', id);
    setUpdatingMenuId(null);
  };

  const handleUpdateItemNumber = async (id: string) => {
    const newNum = editingItemNumbers[id];
    if (newNum === undefined) return;
    setUpdatingMenuId(id);
    await supabase.from('menu_items').update({ item_number: newNum }).eq('id', id);
    setUpdatingMenuId(null);
  };

  const salesData = transactions
    .filter(t => t.type === 'IN')
    .slice(0, 10)
    .map(t => ({ 
      time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
      amount: t.amount 
    }));

  const totalRevenue = transactions.filter(t => t.type === 'IN').reduce((acc, t) => acc + Number(t.amount), 0);

  return (
    <div className="space-y-8 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-7 rounded-[32px] shadow-sm border border-slate-100">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><DollarSign size={24} /></div>
            <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue</p><p className="text-2xl font-black text-slate-800">${totalRevenue.toFixed(0)}</p></div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 p-8 rounded-[48px] text-white shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles size={20} className="text-indigo-400" />
          <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400">AI Analytics</h3>
        </div>
        <p className="text-xl font-bold italic">"{aiInsights}"</p>
      </div>

      <div className="bg-white rounded-[48px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-10 flex justify-between items-center border-b border-slate-50">
          <h3 className="text-3xl font-black tracking-tighter">Menu Management</h3>
          <button onClick={() => setIsEditingMenu(!isEditingMenu)} className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase border-2">
            {isEditingMenu ? <Check size={18} /> : <Edit2 size={18} />}
            {isEditingMenu ? 'Save Codes' : 'Edit Item Codes'}
          </button>
        </div>
        
        <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {menu.map(item => (
            <div key={item.id} className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 hover:bg-white transition-all">
              <div className="flex justify-between items-center mb-6">
                <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black"><Hash size={10} className="inline mr-1" />{item.item_number || '--'}</span>
                <div className={`w-3 h-3 rounded-full ${item.is_available ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              </div>
              
              {isEditingMenu ? (
                <div className="space-y-4">
                  <input value={editingItemNumbers[item.id] ?? item.item_number ?? ''} onChange={(e) => setEditingItemNumbers(prev => ({ ...prev, [item.id]: e.target.value }))} onBlur={() => handleUpdateItemNumber(item.id)} className="w-full p-2 bg-white border rounded-xl" placeholder="Code" />
                  <button onClick={() => toggleAvailability(item.id, item.is_available)} className="w-full py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-black uppercase">{updatingMenuId === item.id ? 'Updating...' : (item.is_available ? 'Disable' : 'Enable')}</button>
                </div>
              ) : (
                <>
                  <h4 className="font-black text-slate-800 text-lg">{item.name}</h4>
                  <p className="text-indigo-600 font-black mb-4">${Number(item.price).toFixed(2)}</p>
                  <p className="text-xs text-slate-400 italic line-clamp-2">{item.description}</p>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
