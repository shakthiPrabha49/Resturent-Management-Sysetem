import React, { useState, useEffect } from 'react';
import { Order, Transaction, StockEntry, MenuItem } from '../types.ts';
import { TrendingUp, Users, DollarSign, Package, Sparkles, Edit2, Check, Loader2, Hash } from 'lucide-react';
import { getBusinessInsights } from '../geminiService.ts';
import { db } from '../db.ts';

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
    await db.from('menu_items').update({ is_available: currentStatus ? 0 : 1 }).eq('id', id);
    setUpdatingMenuId(null);
  };

  const handleUpdateItemNumber = async (id: string) => {
    const newNum = editingItemNumbers[id];
    if (newNum === undefined) return;
    setUpdatingMenuId(id);
    await db.from('menu_items').update({ item_number: newNum }).eq('id', id);
    setUpdatingMenuId(null);
  };

  const totalRevenue = transactions.filter(t => t.type === 'IN').reduce((acc, t) => acc + Number(t.amount), 0);

  return (
    <div className="space-y-6 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign size={20} /></div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</p>
              <p className="text-2xl font-bold text-slate-800">${totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Package size={20} /></div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Orders</p>
              <p className="text-2xl font-bold text-slate-800">{orders.filter(o => o.status !== 'Paid').length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 p-6 rounded-xl text-white shadow-md relative overflow-hidden">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">AI Business Insights</h3>
        </div>
        <p className="text-lg font-medium leading-relaxed opacity-90 italic">"{aiInsights}"</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Menu Overview</h3>
            <p className="text-sm text-slate-500 font-medium">Manage item availability and internal codes.</p>
          </div>
          <button 
            onClick={() => setIsEditingMenu(!isEditingMenu)} 
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-xs uppercase transition-all ${isEditingMenu ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
          >
            {isEditingMenu ? <Check size={16} /> : <Edit2 size={16} />}
            {isEditingMenu ? 'Done Editing' : 'Edit Item Codes'}
          </button>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {menu.map(item => (
            <div key={item.id} className="bg-slate-50 p-5 rounded-xl border border-slate-200 hover:bg-white hover:shadow-md transition-all group">
              <div className="flex justify-between items-center mb-4">
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[10px] font-bold border border-indigo-100">
                  <Hash size={10} className="inline mr-1" />
                  {item.item_number || '--'}
                </span>
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${item.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${item.is_available ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {item.is_available ? 'Available' : 'Unavailable'}
                </div>
              </div>
              
              {isEditingMenu ? (
                <div className="space-y-3">
                  <input 
                    value={editingItemNumbers[item.id] ?? item.item_number ?? ''} 
                    onChange={(e) => setEditingItemNumbers(prev => ({ ...prev, [item.id]: e.target.value }))} 
                    onBlur={() => handleUpdateItemNumber(item.id)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500" 
                    placeholder="Set Code" 
                  />
                  <button 
                    onClick={() => toggleAvailability(item.id, item.is_available)} 
                    className={`w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${item.is_available ? 'bg-white text-rose-600 border-rose-100 hover:bg-rose-50' : 'bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-50'}`}
                  >
                    {updatingMenuId === item.id ? <Loader2 size={14} className="animate-spin mx-auto" /> : (item.is_available ? 'Mark Unavailable' : 'Mark Available')}
                  </button>
                </div>
              ) : (
                <>
                  <h4 className="font-bold text-slate-800 mb-1">{item.name}</h4>
                  <p className="text-indigo-600 font-bold text-sm mb-3">${Number(item.price).toFixed(2)}</p>
                  <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed italic border-t border-slate-200 pt-3">
                    {item.description || "No description provided."}
                  </p>
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