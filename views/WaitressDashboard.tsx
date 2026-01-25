import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Table, MenuItem, Order, TableStatus, OrderStatus, OrderItem, User } from '../types.ts';
import { ShoppingBag, X, Bell, Loader2, Edit3, Eye, EyeOff, PlusCircle, Search, Clock, ArrowLeft, ChevronRight, Hash, Trash2, CreditCard, UserCircle } from 'lucide-react';
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

interface InternalNotification {
  id: string;
  type: 'READY' | 'PING';
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
  const [activeNotifications, setActiveNotifications] = useState<InternalNotification[]>([]);
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

  // Poll for pings from other waitresses
  useEffect(() => {
    const checkPings = async () => {
      try {
        const pings = await db.from('staff_pings').select(`WHERE target_name = '${currentUser.name}' AND timestamp > ${Date.now() - 30000}`);
        if (pings && pings.length > 0) {
          pings.forEach((p: any) => {
            if (!activeNotifications.find(n => n.id === p.id)) {
              playSound(SOUNDS.KITCHEN_BELL);
              setActiveNotifications(prev => [...prev, { 
                id: p.id, 
                type: 'PING',
                tableNumber: p.table_number, 
                message: `${p.sender_name} says T-${p.table_number} needs you!` 
              }]);
            }
          });
        }
      } catch (err) {}
    };

    const interval = setInterval(checkPings, 6000);
    return () => clearInterval(interval);
  }, [currentUser.name, activeNotifications]);

  useEffect(() => {
    tables.forEach(table => {
      const prevStatus = prevTableStatuses.current[table.id];
      if (!isFirstRender.current && table.status === TableStatus.READY && prevStatus !== TableStatus.READY && table.waitress_name === currentUser.name) {
        playSound(SOUNDS.ORDER_READY);
        setActiveNotifications(prev => [...prev, { 
          id: Math.random().toString(36).substr(2, 9), 
          type: 'READY',
          tableNumber: table.number, 
          message: `T-${table.number} cooking finished!` 
        }]);
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

  const handleSendToCashier = async (e: React.MouseEvent, table: Table) => {
    e.stopPropagation();
    const confirmBill = window.confirm(`Send T-${table.number} bill to Cashier for payment?`);
    if (confirmBill) {
      await updateTableStatus(table.id, TableStatus.COMPLETED);
      playSound(SOUNDS.CASH_REGISTER);
    }
  };

  const handlePingWaitress = async (e: React.MouseEvent, table: Table) => {
    e.stopPropagation();
    if (!table.waitress_name) return;
    
    try {
      await db.from('staff_pings').insert([{
        id: Math.random().toString(36).substr(2, 9),
        target_name: table.waitress_name,
        sender_name: currentUser.name,
        table_number: table.number,
        timestamp: Date.now()
      }]);
      alert(`Notified ${table.waitress_name} that T-${table.number} needs attention.`);
    } catch (err) {}
  };

  const handleTableClick = (table: Table) => {
    if (isEditingLayout) return;
    
    const isOccupied = [TableStatus.ORDERING, TableStatus.COOKING, TableStatus.READY].includes(table.status);
    if (isOccupied && table.waitress_name && table.waitress_name !== currentUser.name) {
      alert(`This table is being handled by ${table.waitress_name}. You can use the "Notify" button to send her a message if the customers need help.`);
      return;
    }
    
    setSelectedTable(table);
  };

  if (!selectedTable) {
    return (
      <div className="relative animate-in fade-in duration-500">
        <div className="fixed top-24 right-6 z-[100] space-y-3 pointer-events-none w-72">
          {activeNotifications.map(notif => (
            <div key={notif.id} className={`pointer-events-auto border p-4 rounded-xl shadow-xl flex items-start gap-4 animate-in slide-in-from-right duration-300 ${notif.type === 'PING' ? 'bg-indigo-900 text-white border-indigo-700' : 'bg-white text-slate-900 border-slate-200'}`}>
              <div className={`p-2 rounded-lg ${notif.type === 'PING' ? 'bg-indigo-700 text-indigo-200' : 'bg-emerald-50 text-emerald-600'}`}>
                {notif.type === 'PING' ? <UserCircle size={18} /> : <Bell size={18} />}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm">{notif.type === 'PING' ? 'Staff Alert' : 'Order Ready!'}</h4>
                <p className="text-[11px] opacity-80 font-medium mt-0.5">{notif.message}</p>
              </div>
              <button onClick={() => setActiveNotifications(p => p.filter(n => n.id !== notif.id))} className="opacity-50 hover:opacity-100 transition-opacity"><X size={14} /></button>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Restaurant Floor</h2>
            <p className="text-sm text-slate-500 font-medium">Assigned tables are locked to their respective waitress.</p>
          </div>
          <button 
            onClick={() => setIsEditingLayout(!isEditingLayout)} 
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${isEditingLayout ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            {isEditingLayout ? <Eye size={14} /> : <Edit3 size={14} />}
            {isEditingLayout ? 'Finish Setup' : 'Configure Floor'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {visibleTables.map(table => {
            const tableOrder = orders.find(o => o.table_id === table.id && o.status !== OrderStatus.PAID);
            const isOccupied = [TableStatus.ORDERING, TableStatus.COOKING, TableStatus.READY].includes(table.status);
            const isMine = !isOccupied || table.waitress_name === currentUser.name;

            const statusColors: any = {
              [TableStatus.AVAILABLE]: 'bg-slate-50 text-slate-400 border-slate-200',
              [TableStatus.ORDERING]: 'bg-amber-50 text-amber-600 border-amber-200',
              [TableStatus.COOKING]: 'bg-indigo-50 text-indigo-600 border-indigo-200',
              [TableStatus.READY]: 'bg-emerald-50 text-emerald-600 border-emerald-200',
              [TableStatus.COMPLETED]: 'bg-slate-900 text-white border-slate-900',
            };

            return (
              <div key={table.id} className="relative">
                <button 
                  onClick={() => handleTableClick(table)} 
                  className={`w-full p-6 rounded-xl border transition-all text-left flex flex-col justify-between h-56 group ${isEditingLayout ? 'opacity-60 cursor-default' : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-lg hover:-translate-y-1'}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-3xl font-bold text-slate-800">T{table.number}</span>
                    <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${statusColors[table.status] || statusColors[TableStatus.AVAILABLE]}`}>
                      {table.status}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 mt-auto">
                    {isOccupied && (
                      <div className="flex flex-col mb-1 border-t border-slate-50 pt-2">
                        <div className="text-[10px] font-bold text-indigo-600 truncate flex items-center gap-1">
                          <UserCircle size={10} /> {table.waitress_name}'s Table
                        </div>
                        {isMine && tableOrder && (
                           <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-1">
                           <Clock size={10} /> {Math.floor((Date.now() - tableOrder.timestamp) / 60000)}m
                         </div>
                        )}
                      </div>
                    )}

                    {!isEditingLayout && isOccupied && (
                      isMine ? (
                        <button 
                          onClick={(e) => handleSendToCashier(e, table)}
                          className="w-full py-2 bg-indigo-600 text-white text-[9px] font-bold uppercase rounded-lg hover:bg-indigo-700 transition-all shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <CreditCard size={12} /> Send Bill
                        </button>
                      ) : (
                        <button 
                          onClick={(e) => handlePingWaitress(e, table)}
                          className="w-full py-2 bg-slate-100 text-slate-600 text-[9px] font-bold uppercase rounded-lg hover:bg-slate-200 transition-all border border-slate-200 flex items-center justify-center gap-1.5"
                        >
                          <Bell size={12} /> Notify {table.waitress_name}
                        </button>
                      )
                    )}

                    {!isEditingLayout && table.status === TableStatus.COMPLETED && (
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 italic">At Checkout...</p>
                        {isMine && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); db.from('tables').update({ status: TableStatus.AVAILABLE, waitress_name: null }).eq('id', table.id); }} 
                            className="w-full py-2 bg-slate-900 text-white text-[9px] font-bold uppercase rounded-lg hover:bg-slate-800 transition-all shadow-sm"
                          >
                            Reset Floor
                          </button>
                        )}
                      </div>
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
          <div className="mt-16 bg-slate-100/50 p-10 rounded-2xl border-2 border-dashed border-slate-200 text-center">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-8">Tables Hidden From Layout</h3>
            <div className="flex flex-wrap justify-center gap-4">
              {hiddenTables.map(table => (
                <button 
                  key={table.id} 
                  onClick={() => toggleTableVisibility(table.id)}
                  className="flex items-center gap-3 px-5 py-3 bg-white rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:border-emerald-500 hover:text-emerald-600 transition-all shadow-sm group"
                >
                  <PlusCircle size={18} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                  Show T{table.number}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- VIEW 2: ITEM MENU (Order Entry) ---
  return (
    <div className="max-w-7xl mx-auto animate-in slide-in-from-right-4 duration-400">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-5">
          <button 
            onClick={() => setSelectedTable(null)}
            className="p-3 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-all shadow-sm group"
          >
            <ArrowLeft size={22} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Table T{selectedTable.number}</h2>
            <p className="text-sm font-semibold text-slate-500 flex items-center gap-2 mt-1">
              Serving: {selectedTable.waitress_name || currentUser.name}
              {activeOrderForSelected && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold uppercase border border-indigo-100">
                  <ChevronRight size={10} /> Appending Ticket
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            placeholder="Search menu..." 
            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm" 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredMenu.length > 0 ? filteredMenu.map(item => {
              const cartItem = cart.find(i => i.menuItemId === item.id);
              return (
                <div key={item.id} className={`flex flex-col p-6 rounded-2xl border transition-all ${cartItem ? 'bg-indigo-50 border-indigo-300 ring-4 ring-indigo-500/5' : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-md'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="font-bold text-slate-800 text-lg leading-tight truncate">{item.name}</h4>
                      <p className="text-[12px] font-bold text-indigo-600 uppercase tracking-widest mt-1">${Number(item.price).toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <p className="text-[11px] font-medium text-slate-400 line-clamp-2 italic mb-6 leading-relaxed">
                    {item.description || "Chef's special selection prepared with fresh ingredients."}
                  </p>

                  <div className="mt-auto pt-4 border-t border-slate-100/50">
                    {cartItem ? (
                      <div className="flex items-center gap-4 bg-white px-3 py-1.5 rounded-xl border border-indigo-100 shadow-sm w-fit">
                        <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 flex items-center justify-center text-indigo-600 font-bold hover:bg-indigo-50 rounded-lg transition-colors text-lg">-</button>
                        <span className="text-sm font-bold text-slate-800 w-4 text-center">{cartItem.quantity}</span>
                        <button onClick={() => addToCart(item)} className="w-8 h-8 flex items-center justify-center text-indigo-600 font-bold hover:bg-indigo-50 rounded-lg transition-colors text-lg">+</button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => addToCart(item)} 
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-md"
                      >
                        Add to Order
                      </button>
                    )}
                  </div>
                </div>
              );
            }) : (
              <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <Search size={40} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Menu item not found</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 sticky top-28">
          <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 text-white overflow-hidden flex flex-col min-h-[500px]">
            <div className="p-8 border-b border-white/5 bg-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <ShoppingBag size={20} className="text-indigo-400" />
                  Table Tray
                </h3>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} className="text-[10px] font-bold text-rose-400 hover:text-rose-300 uppercase tracking-widest flex items-center gap-1">
                    <Trash2 size={12} /> Reset
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 p-8 overflow-y-auto space-y-6">
              {cart.length > 0 ? (
                cart.map(item => (
                  <div key={item.menuItemId} className="flex justify-between items-center group animate-in slide-in-from-right-2">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 flex items-center justify-center bg-slate-800 rounded-xl text-[12px] font-bold text-indigo-400 border border-slate-700">
                        {item.quantity}x
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-100 block">{item.name}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">${item.price.toFixed(2)}</span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-emerald-400">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-20 opacity-20">
                  <ShoppingBag size={48} className="mb-4" />
                  <p className="text-xs font-bold uppercase tracking-widest">Select items to start ticket</p>
                </div>
              )}
            </div>

            <div className="p-8 bg-black/40 border-t border-white/5">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Total Bill</span>
                  <span className="text-3xl font-bold text-white tracking-tighter">${cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0).toFixed(2)}</span>
                </div>
              </div>
              <button 
                onClick={submitOrder} 
                disabled={cart.length === 0 || isSubmitting} 
                className="w-full py-5 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:bg-indigo-700 disabled:opacity-20 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs active:scale-95"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><Bell size={20} /> Place Kitchen Ticket</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitressDashboard;