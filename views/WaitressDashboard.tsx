import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Table, MenuItem, Order, TableStatus, OrderStatus, OrderItem, User } from '../types.ts';
import { ShoppingBag, X, Bell, Loader2, Edit3, Eye, EyeOff, PlusCircle, Search, Clock, ArrowLeft, ChevronRight } from 'lucide-react';
import { db } from '../db.ts';
import { playSound, SOUNDS } from '../utils/audio.ts';

interface WaitressDashboardProps {
  currentUser: User;
  tables: Table[];
  menu: MenuItem[];
  orders: Order[];
  updateTableStatus: (tableId: string, status: TableStatus, waitressName?: string | null) => void;
  addNotification: (msg: string) => void;
  selectedTable: Table | null;
  setSelectedTable: (table: Table | null) => void;
}

interface ChefNotification {
  id: string;
  tableNumber: number;
  message: string;
}

const WaitressDashboard: React.FC<WaitressDashboardProps> = ({ 
  currentUser, tables, menu, orders, updateTableStatus, addNotification,
  selectedTable, setSelectedTable
}) => {
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
    return menu.filter(item => 
      (item.name.toLowerCase().includes(query) || item.item_number?.toLowerCase().includes(query)) &&
      item.is_available
    );
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

  // 1. Table Floor View
  if (!selectedTable) {
    return (
      <div className="relative animate-in fade-in duration-300">
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

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
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
              <div key={table.id} className="relative">
                <button 
                  onClick={() => !isEditingLayout && setSelectedTable(table)} 
                  className={`w-full p-6 rounded-xl border transition-all text-left flex flex-col justify-between h-40 group ${isEditingLayout ? 'opacity-70 cursor-default' : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-md'}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-2xl font-bold text-slate-800">T-{table.number}</span>
                    <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-tight border ${statusColors[table.status] || statusColors[TableStatus.AVAILABLE]}`}>
                      {table.status}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1 mt-auto">
                    {tableOrder ? (
                      <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <Clock size={10} /> {Math.floor((Date.now() - tableOrder.timestamp) / 60000)}m
                      </div>
                    ) : (
                      <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Ready</div>
                    )}
                    
                    {!isEditingLayout && table.status === TableStatus.COMPLETED && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); db.from('tables').update({ status: TableStatus.AVAILABLE }).eq('id', table.id); }} 
                        className="w-full mt-3 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-slate-800 transition-all"
                      >
                        Reset Table
                      </button>
                    )}
                  </div>
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
          <div className="mt-12 bg-slate-100 p-8 rounded-xl border-2 border-dashed border-slate-200">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Hidden From Main View</h3>
            <div className="flex flex-wrap gap-3">
              {hiddenTables.map(table => (
                <button 
                  key={table.id} 
                  onClick={() => toggleTableVisibility(table.id)}
                  className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:border-emerald-500 hover:text-emerald-600 transition-all shadow-sm"
                >
                  <PlusCircle size={16} className="text-emerald-500" />
                  Table T-{table.number}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Focused Ordering View
  return (
    <div className="max-w-6xl mx-auto animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => setSelectedTable(null)}
          className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Table T-{selectedTable.number}</h2>
          <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
            Order Management
            {activeOrderForSelected && (
              <>
                <ChevronRight size={14} />
                <span className="text-indigo-600 font-bold">Active Ticket</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Menu Side */}
        <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder="Search menu items or item codes..." 
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm" 
              />
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto">
            {filteredMenu.map(item => {
              const cartItem = cart.find(i => i.menuItemId === item.id);
              return (
                <div key={item.id} className={`flex flex-col p-4 rounded-xl border transition-all ${cartItem ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-100' : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50 shadow-sm'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="font-bold text-slate-800 truncate">{item.name}</p>
                      <p className="text-[11px] font-bold text-indigo-600 uppercase mt-0.5">${Number(item.price).toFixed(2)}</p>
                    </div>
                    {item.item_number && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[9px] font-bold rounded">#{item.item_number}</span>
                    )}
                  </div>
                  
                  <div className="mt-auto flex items-center justify-between">
                    <p className="text-[10px] font-medium text-slate-400 line-clamp-1 italic">{item.description || "Freshly prepared"}</p>
                    <div className="flex items-center gap-2">
                      {cartItem ? (
                        <div className="flex items-center gap-3">
                          <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors shadow-sm">-</button>
                          <span className="text-sm font-bold text-slate-800 w-4 text-center">{cartItem.quantity}</span>
                          <button onClick={() => addToCart(item)} className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">+</button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => addToCart(item)} 
                          className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100"
                        >
                          Add to Order
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cart Side */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 text-white overflow-hidden flex flex-col min-h-[400px]">
            <div className="p-6 border-b border-slate-800 bg-slate-800/50">
              <h3 className="text-md font-bold flex items-center gap-2">
                <ShoppingBag size={18} className="text-indigo-400" />
                Current Order
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                {cart.length === 0 ? "Empty Order" : `${cart.reduce((a, b) => a + b.quantity, 0)} Items Selected`}
              </p>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {cart.length > 0 ? (
                cart.map(item => (
                  <div key={item.menuItemId} className="flex justify-between items-center group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded-lg text-[11px] font-bold text-indigo-400 border border-slate-700">
                        {item.quantity}x
                      </div>
                      <span className="text-sm font-semibold opacity-90">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-400">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                  <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-slate-600 mb-3 border border-slate-700">
                    <ShoppingBag size={24} />
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Basket is empty</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-800/30 border-t border-slate-800">
              <div className="flex justify-between items-center mb-6">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Amount</span>
                <span className="text-2xl font-bold text-white">${cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0).toFixed(2)}</span>
              </div>
              <button 
                onClick={submitOrder} 
                disabled={cart.length === 0 || isSubmitting} 
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-800 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <><Bell size={18} /> Send to Kitchen</>}
              </button>
            </div>
          </div>
          
          <button 
            onClick={() => setSelectedTable(null)}
            className="w-full py-3 bg-white border border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition-all text-xs uppercase tracking-widest shadow-sm"
          >
            Cancel and Return
          </button>
        </div>
      </div>
    </div>
  );
};

export default WaitressDashboard;