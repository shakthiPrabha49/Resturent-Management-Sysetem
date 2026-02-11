
import React, { useState, useEffect } from 'react';
import { Order, Transaction, StockEntry, MenuItem } from '../types.ts';
import { TrendingUp, DollarSign, Package, Edit2, Check, Loader2, Hash, Plus, Trash2, X, Save } from 'lucide-react';
import { db } from '../db.ts';

interface OwnerDashboardProps {
  orders: Order[];
  transactions: Transaction[];
  stock: StockEntry[];
  menu: MenuItem[];
  setMenu: React.Dispatch<React.SetStateAction<MenuItem[]>>;
}

const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ orders, transactions, stock, menu, setMenu }) => {
  const [isEditingMenu, setIsEditingMenu] = useState(false);
  const [updatingMenuId, setUpdatingMenuId] = useState<string | null>(null);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<Partial<MenuItem>>({
    name: '',
    item_number: '',
    category: 'Main',
    price: 0,
    description: '',
    is_available: true
  });

  const [editBuffer, setEditBuffer] = useState<Record<string, MenuItem>>({});

  useEffect(() => {
    if (isEditingMenu) {
      const buffer: Record<string, MenuItem> = {};
      menu.forEach(m => { buffer[m.id] = { ...m }; });
      setEditBuffer(buffer);
    }
  }, [isEditingMenu, menu]);

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    setUpdatingMenuId(id);
    setMenu(prev => prev.map(m => m.id === id ? { ...m, is_available: !currentStatus } : m));
    
    try {
      await db.from('menu_items').update({ is_available: currentStatus ? 0 : 1 }).eq('id', id);
    } catch (err) {
      console.error(err);
    }
    setUpdatingMenuId(null);
  };

  const handleLocalBufferChange = (id: string, field: string, value: any) => {
    setEditBuffer(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const syncItemToDb = async (id: string) => {
    setUpdatingMenuId(id);
    const item = editBuffer[id];
    setMenu(prev => prev.map(m => m.id === id ? item : m));

    try {
      await db.from('menu_items').update({
        name: item.name,
        item_number: item.item_number,
        price: item.price,
        description: item.description,
        category: item.category
      }).eq('id', id);
    } catch (err) {
      console.error("Failed to sync item:", err);
    }
    setUpdatingMenuId(null);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price) return;
    
    setUpdatingMenuId('new');
    const itemToAdd: any = {
      ...newItem,
      id: 'm' + Math.random().toString(36).substr(2, 5),
      is_available: 1
    };
    
    try {
      await db.from('menu_items').insert([itemToAdd]);
      setMenu(prev => [...prev, { ...itemToAdd, is_available: true }]);
      setNewItem({ name: '', item_number: '', category: 'Main', price: 0, description: '', is_available: true });
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    }
    setUpdatingMenuId(null);
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this item?")) return;
    setUpdatingMenuId(id);
    setMenu(prev => prev.filter(m => m.id !== id));
    try {
      await db.from('menu_items').delete().eq('id', id);
    } catch (err) {
      console.error(err);
    }
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
              <p className="text-2xl font-bold text-slate-800">Rs. {totalRevenue.toLocaleString()}</p>
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
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><TrendingUp size={20} /></div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Growth</p>
              <p className="text-2xl font-bold text-slate-800">+12%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Menu Management</h3>
            <p className="text-sm text-slate-500 font-medium">Control item details, availability, and pricing.</p>
          </div>
          <div className="flex gap-3">
            {isEditingMenu && (
              <button 
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-xs uppercase shadow-sm hover:bg-indigo-700 transition-all"
              >
                <Plus size={16} /> Add Item
              </button>
            )}
            <button 
              onClick={() => setIsEditingMenu(!isEditingMenu)} 
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-xs uppercase transition-all ${isEditingMenu ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
            >
              {isEditingMenu ? <Check size={16} /> : <Edit2 size={16} />}
              {isEditingMenu ? 'Finish Editing' : 'Edit Menu Details'}
            </button>
          </div>
        </div>

        {showAddForm && (
          <div className="p-6 bg-slate-50 border-b border-slate-200 animate-in slide-in-from-top-4 duration-300">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-slate-800">New Menu Item</h4>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-rose-500"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input 
                placeholder="Item Name" 
                className="p-3 bg-white border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500" 
                value={newItem.name} 
                onChange={e => setNewItem({...newItem, name: e.target.value})}
                required
              />
              <input 
                placeholder="Item Code" 
                className="p-3 bg-white border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500" 
                value={newItem.item_number} 
                onChange={e => setNewItem({...newItem, item_number: e.target.value})}
              />
              <input 
                type="number" step="0.01"
                placeholder="Price (Rs.)" 
                className="p-3 bg-white border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500" 
                value={newItem.price || ''} 
                onChange={e => setNewItem({...newItem, price: parseFloat(e.target.value)})}
                required
              />
              <select 
                className="p-3 bg-white border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                value={newItem.category}
                onChange={e => setNewItem({...newItem, category: e.target.value})}
              >
                <option value="Main">Main</option>
                <option value="Appetizer">Appetizer</option>
                <option value="Dessert">Dessert</option>
                <option value="Drink">Drink</option>
              </select>
              <textarea 
                placeholder="Brief description..." 
                className="p-3 bg-white border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 md:col-span-3 h-12"
                value={newItem.description}
                onChange={e => setNewItem({...newItem, description: e.target.value})}
              />
              <button 
                type="submit" 
                disabled={updatingMenuId === 'new'}
                className="bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all text-xs uppercase flex items-center justify-center gap-2"
              >
                {updatingMenuId === 'new' ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Save Item</>}
              </button>
            </form>
          </div>
        )}
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {menu.map(item => {
            const buffered = editBuffer[item.id] || item;
            
            return (
              <div key={item.id} className={`bg-slate-50 p-5 rounded-xl border transition-all group ${isEditingMenu ? 'border-indigo-200 ring-2 ring-indigo-50' : 'border-slate-200 hover:bg-white hover:shadow-md'}`}>
                {isEditingMenu ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <input 
                        className="w-full bg-transparent font-bold text-slate-800 border-b border-indigo-100 focus:border-indigo-500 outline-none"
                        value={buffered.name}
                        onChange={e => handleLocalBufferChange(item.id, 'name', e.target.value)}
                        onBlur={() => syncItemToDb(item.id)}
                        placeholder="Name"
                      />
                      <button 
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Code</label>
                        <input 
                          className="w-full p-2 bg-white border border-slate-200 rounded text-xs font-semibold"
                          value={buffered.item_number || ''}
                          onChange={e => handleLocalBufferChange(item.id, 'item_number', e.target.value)}
                          onBlur={() => syncItemToDb(item.id)}
                          placeholder="M1"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Price</label>
                        <input 
                          type="number" step="0.01"
                          className="w-full p-2 bg-white border border-slate-200 rounded text-xs font-semibold"
                          value={buffered.price}
                          onChange={e => handleLocalBufferChange(item.id, 'price', parseFloat(e.target.value))}
                          onBlur={() => syncItemToDb(item.id)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Description</label>
                      <textarea 
                        className="w-full p-2 bg-white border border-slate-200 rounded text-[11px] font-medium h-16 resize-none"
                        value={buffered.description || ''}
                        onChange={e => handleLocalBufferChange(item.id, 'description', e.target.value)}
                        onBlur={() => syncItemToDb(item.id)}
                        placeholder="Ingredients..."
                      />
                    </div>

                    <div className="flex gap-2">
                       <button 
                        onClick={() => toggleAvailability(item.id, item.is_available)} 
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all ${item.is_available ? 'bg-white text-rose-600 border-rose-100 hover:bg-rose-50' : 'bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-50'}`}
                      >
                        {updatingMenuId === item.id ? <Loader2 size={12} className="animate-spin mx-auto" /> : (item.is_available ? 'Disable' : 'Enable')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
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
                    
                    <h4 className="font-bold text-slate-800 mb-1">{item.name}</h4>
                    <p className="text-indigo-600 font-bold text-sm mb-3">Rs. {Number(item.price).toFixed(2)}</p>
                    <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed italic border-t border-slate-200 pt-3">
                      {item.description || "No description provided."}
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
