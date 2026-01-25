import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Table, MenuItem, Order, TableStatus, OrderStatus, OrderItem, User } from '../types.ts';
import { ShoppingBag, X, Bell, Loader2, Edit3, Eye, EyeOff, PlusCircle, Search, Clock } from 'lucide-react';
import { db } from '../db.ts';
import { playSound, SOUNDS } from '../utils/audio.ts';

interface WaitressDashboardProps {
  currentUser: User;
  tables: Table[];
  menu: MenuItem[];
  orders: Order[];
  updateTableStatus: (tableId: string, status: TableStatus, waitressName?: string | null) => void;
  addNotification: (msg: string) => void;
}

interface ChefNotification {
  id: string;
  tableNumber: number;
  message: string;
}

const WaitressDashboard: React.FC<WaitressDashboardProps> = ({ 
  currentUser, tables, menu, orders, updateTableStatus, addNotification 
}) => {
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNotifications, setActiveNotifications] = useState<ChefNotification[]>([]);
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  
  const STORAGE_KEY = `gustoflow_hidden_tables_${currentUser.username}`;
  const [hiddenTableIds, setHiddenTableIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hiddenTableIds));
  }, [hiddenTableIds, STORAGE_KEY]);

  const toggleTableVisibility = (id: string) => {
    setHiddenTableIds(prev => 
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  const visibleTables = useMemo(() => 
    tables.filter(t => !hiddenTableIds.includes(t.id)), 
  [tables, hiddenTableIds]);

  const hiddenTables = useMemo(() => 
    tables.filter(t => hiddenTableIds.includes(t.id)), 
  [tables, hiddenTableIds]);

  const prevTableStatuses = useRef<Record<string, TableStatus>>({});
  const isFirstRender = useRef(true);

  useEffect(() => {
    tables.forEach(table => {
      const prevStatus = prevTableStatuses.current[table.id];
      if (!isFirstRender.current && table.status === TableStatus.READY && prevStatus !== TableStatus.READY && table.waitress_name === currentUser.name) {
        playSound(SOUNDS.ORDER_READY);
        setActiveNotifications(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), tableNumber: table.number, message: `T-${table.number} cooking finished!` }]);
      }
      prevTableStatuses.current[table.id] = table.status;
    });
    isFirstRender.current = false;
  }, [tables, currentUser.name]);

  const activeOrderForSelected = useMemo(() => {
    if (!selectedTable) return null;
    return orders.find(o => o.table_id === selectedTable.id && o.status !== OrderStatus.PAID);
  }, [selectedTable, orders]);

  const filteredMenu = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return menu.filter(item => item.name.toLowerCase().includes(query) || item.item_number?.toLowerCase().includes(query));
  }, [menu, searchQuery]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuItemId === item.id);
      if (existing) return prev.map(i => i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { menuItemId: item.id, name: item.name, quantity: 1, price: item.price, status: 'Pending' }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuItemId === itemId);
      if (existing && existing.quantity > 1) return prev.map(i => i.menuItemId === itemId ? { ...i, quantity: i.quantity - 1 } : i);
      return prev.filter(i => i.menuItemId !== itemId);
    });
  };

  const submitOrder = async () => {
    if (!selectedTable || cart.length === 0) return;
    setIsSubmitting(true);
    const cartTotal = cart.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);

    try {
      if (activeOrderForSelected) {
        const updatedItems = [...activeOrderForSelected.items, ...cart];
        const updatedTotal = Number(activeOrderForSelected.total) + cartTotal;
        await db.from('orders').update({ items: updatedItems, total: updatedTotal, status: OrderStatus.PENDING }).eq('id', activeOrderForSelected.id);
      } else {
        const newOrder = { id: Math.random().toString(36).substr(2, 9), table_id: selectedTable.id, table_number: selectedTable.number, items: cart, status: OrderStatus.PENDING, timestamp: Date.now(), total: cartTotal, waitress_name: currentUser.name };
        await db.from('orders').insert([newOrder]);
      }
      await updateTableStatus(selectedTable.id, TableStatus.ORDERING, currentUser.name);
      playSound(SOUNDS.SEND_ORDER);
      setCart([]);
      setSelectedTable(null);
    } catch (err: any) {
      alert(`Order Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative pb-10">
      <div className="fixed top-24 right-6 z-[100] space-y-3 pointer-events-none w-72">
        {activeNotifications.map(notif => (
          <div key={notif.id} className="pointer-events-auto bg-white border border-slate-200 p-4 rounded-xl shadow-xl flex items-start gap-4 animate-in slide-in-from-right duration-300">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Bell size={18} /></div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 text-sm">Order Ready!</h4>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">{notif.message}</p>
            </div>
            <button onClick={() => setActiveNotifications(p => p.filter(n => n.id !== notif.id))} className="text-slate-300 hover:text-slate-500 transition-colors"><X size={14} /></button>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Assigned Tables</h2>
          <p className="text-sm text-slate-500 font-medium">{visibleTables.length} active in your layout</p>
        </div>
        <button 
          onClick={() => setIsEditingLayout(!isEditingLayout)} 
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${isEditingLayout ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          {isEditingLayout ? <Eye size={14} /> : <Edit3 size={14} />}
          {isEditingLayout ? 'Save Layout' : 'Customize Layout'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {visibleTables.map(table => {
              const tableOrder = orders.find(o => o.table_id === table.id && o.status !== OrderStatus.PAID);
              const statusColors: any = {
                [TableStatus.AVAILABLE]: 'bg-slate-100 text-slate-500 border-slate-200',
                [TableStatus.ORDERING]: 'bg-amber-100 text-amber-700 border-amber-200',
                [TableStatus.COOKING]: 'bg-indigo-100 text-indigo-700 border-indigo-200',
                [TableStatus.READY]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                [TableStatus.COMPLETED]: 'bg-slate-900 text-white border-slate-900',
              };

              return (
                <div key={table.id} className="relative group">
                  <button 
                    onClick={() => !isEditingLayout && setSelectedTable(table)} 
                    className={`w-full p-5 rounded-xl border transition-all text-left flex flex-col justify-between h-36 ${selectedTable?.id === table.id ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20' : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-2xl font-bold text-slate-800">T-{table.number}</span>
                      <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-tight border ${statusColors[table.status] || statusColors[TableStatus.AVAILABLE]}`}>
                        {table.status}
                      </div>
                    </div>
                    
                    {tableOrder && (
                      <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mt-auto">
                        <Clock size={10} /> {Math.floor((Date.now() - tableOrder.timestamp) / 60000)}m
                      </div>
                    )}

                    {!isEditingLayout && table.status === TableStatus.COMPLETED && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); db.from('tables').update({ status: TableStatus.AVAILABLE }).eq('id', table.id); }} 
                        className="w-full mt-3 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-slate-800 transition-all"
                      >
                        Reset Table
                      </button>
                    )}
                  </button>
                  {isEditingLayout && (
                    <button 
                      onClick={() => toggleTableVisibility(table.id)}
                      className="absolute -top-2 -right-2 p-1.5 bg-rose-500 text-white rounded-full shadow-lg hover:bg-rose-600 transition-colors z-10"
                    >
                      <EyeOff size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {isEditingLayout && hiddenTables.length > 0 && (
            <div className="bg-slate-100 p-6 rounded-xl border-2 border-dashed border-slate-200">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Hidden Tables</h3>
              <div className="flex flex-wrap gap-2">
                {hiddenTables.map(table => (
                  <button 
                    key={table.id} 
                    onClick={() => toggleTableVisibility(table.id)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:border-emerald-500 transition-all"
                  >
                    <PlusCircle size={14} className="text-emerald-500" />
                    Table T-{table.number}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 flex flex-col">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-[500px] sticky top-28 overflow-hidden">
            {selectedTable ? (
              <div className="flex flex-col h-full flex-1">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Order: T-{selectedTable.number}</h3>
                    <button onClick={() => setSelectedTable(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"><X size={18} /></button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      value={searchQuery} 
                      onChange={(e) => setSearchQuery(e.target.value)} 
                      placeholder="Find item..." 
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {filteredMenu.map(item => {
                    const cartItem = cart.find(i => i.menuItemId === item.id);
                    return (
                      <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${cartItem ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-transparent hover:bg-slate-50'}`}>
                        <div className="flex-1 min-w-0 pr-3">
                          <p className="font-bold text-sm text-slate-800 truncate">{item.name}</p>
                          <p className="text-[11px] text-slate-500 font-medium">${item.price}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {cartItem ? (
                            <>
                              <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 flex items-center justify-center border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50">-</button>
                              <span className="w-6 text-center text-sm font-bold">{cartItem.quantity}</span>
                              <button onClick={() => addToCart(item)} className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">+</button>
                            </>
                          ) : (
                            <button onClick={() => addToCart(item)} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all">Add</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-6 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-4 text-slate-800">
                    <span className="text-sm font-bold">Total Items</span>
                    <span className="text-lg font-bold">{cart.reduce((a, b) => a + b.quantity, 0)}</span>
                  </div>
                  <button 
                    onClick={submitOrder} 
                    disabled={cart.length === 0 || isSubmitting} 
                    className="w-full py-4 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><ShoppingBag size={18} /> Send to Kitchen</>}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 mb-4">
                  <ShoppingBag size={32} />
                </div>
                <h4 className="text-slate-800 font-bold mb-1">No Table Selected</h4>
                <p className="text-slate-400 text-xs font-medium">Select a table to start placing orders.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitressDashboard;