
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Table, MenuItem, Order, TableStatus, OrderStatus, OrderItem, User, Customer } from '../types.ts';
import { ShoppingBag, X, Bell, Loader2, Edit3, Eye, EyeOff, Search, Clock, ArrowLeft, Hash, CreditCard, UserCircle, UserCheck, UserPlus } from 'lucide-react';
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
  onViewChange?: (view: string) => void;
}

interface InternalNotification {
  id: string;
  type: 'READY' | 'PING';
  tableNumber: number;
  message: string;
}

const WaitressDashboard: React.FC<WaitressDashboardProps> = ({ 
  currentUser, tables, menu, orders, updateTableStatus, addNotification,
  selectedTable, setSelectedTable, onViewChange
}) => {
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNotifications, setActiveNotifications] = useState<InternalNotification[]>([]);
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  
  const [customerPhone, setCustomerPhone] = useState('');
  const [linkedCustomer, setLinkedCustomer] = useState<Customer | null>(null);
  const [isCustomerBarVisible, setIsCustomerBarVisible] = useState(true);

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

  const prevTableStatuses = useRef<Record<string, TableStatus>>({});
  const isFirstRender = useRef(true);

  useEffect(() => {
    const lookupCustomer = async () => {
      if (customerPhone.trim().length >= 8) {
        try {
          const result = await db.from('customers').maybeSingle("phone = ?", [customerPhone.trim()]);
          if (result) {
            setLinkedCustomer(result as Customer);
          } else {
            setLinkedCustomer(null);
          }
        } catch (err) {
          setLinkedCustomer(null);
        }
      } else {
        setLinkedCustomer(null);
      }
    };
    const debounceTimer = setTimeout(lookupCustomer, 300);
    return () => clearTimeout(debounceTimer);
  }, [customerPhone]);

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

  useEffect(() => {
    if (activeOrderForSelected?.customer_phone) {
      setCustomerPhone(activeOrderForSelected.customer_phone);
    }
  }, [activeOrderForSelected]);

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
        await db.from('orders').update({ 
          items: updatedItems, 
          total: updatedTotal, 
          status: OrderStatus.PENDING,
          customer_phone: customerPhone || null
        }).eq('id', activeOrderForSelected.id);
      } else {
        const newOrder = { 
          id: Math.random().toString(36).substr(2, 9), 
          table_id: selectedTable.id, 
          table_number: selectedTable.number, 
          items: cart, 
          status: OrderStatus.PENDING, 
          timestamp: Date.now(), 
          total: cartTotal, 
          waitress_name: currentUser.name,
          customer_phone: customerPhone || null
        };
        await db.from('orders').insert([newOrder]);
      }
      await updateTableStatus(selectedTable.id, TableStatus.ORDERING, currentUser.name);
      playSound(SOUNDS.SEND_ORDER);
      setCart([]);
      setSelectedTable(null);
      setCustomerPhone('');
      setLinkedCustomer(null);
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
      alert(`Locked! Table ${table.number} belongs to ${table.waitress_name}.`);
      return;
    }
    setSelectedTable(table);
    setIsCustomerBarVisible(true);
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
            <p className="text-sm text-slate-500 font-medium">Click a table to open menu and link customer.</p>
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
                          <Bell size={12} /> Notify Staff
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
                            Reset Table
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </button>
                {isEditingLayout && (
                  <button onClick={() => toggleTableVisibility(table.id)} className="absolute -top-2 -right-2 p-1.5 bg-rose-500 text-white rounded-full shadow-lg hover:bg-rose-600 transition-colors z-10"><EyeOff size={12} /></button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-in slide-in-from-right-4 duration-400 pb-20">
      
      {isCustomerBarVisible && (
        <div className="mb-8 bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-800 animate-in slide-in-from-top-4 duration-500">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20"><UserPlus size={22} /></div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide uppercase">Link Customer</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 italic">Enter phone to find profile</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:flex-1 max-w-2xl">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Enter Phone Number..."
                  className="w-full pl-12 pr-6 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all placeholder:text-slate-600"
                />
              </div>

              {linkedCustomer ? (
                <div className="flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/30 px-6 py-4 rounded-2xl w-full md:w-auto animate-in zoom-in duration-300">
                  <UserCheck size={20} className="text-emerald-400" />
                  <div className="flex-1">
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Found Member</p>
                    <p className="text-sm font-bold text-white whitespace-nowrap">{linkedCustomer.name}</p>
                  </div>
                  <button onClick={() => setIsCustomerBarVisible(false)} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-600 transition-all">Done</button>
                </div>
              ) : customerPhone.length >= 8 ? (
                <button 
                  onClick={() => onViewChange && onViewChange('CustomerData')}
                  className="w-full md:w-auto px-8 py-4 bg-rose-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 animate-in zoom-in duration-300 whitespace-nowrap"
                >
                  <UserPlus size={16} /> Register
                </button>
              ) : null}
            </div>

            <button onClick={() => setIsCustomerBarVisible(false)} className="p-3 text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-5">
          <button onClick={() => setSelectedTable(null)} className="p-3 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-all shadow-sm"><ArrowLeft size={22} /></button>
          <div>
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Table T{selectedTable.number}</h2>
            <div className="flex items-center gap-3 mt-1">
              {linkedCustomer && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-bold uppercase border border-emerald-100"><UserCheck size={10} /> Linked: {linkedCustomer.name}</div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search menu..." className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none shadow-sm" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredMenu.map(item => {
              const cartItem = cart.find(i => i.menuItemId === item.id);
              return (
                <div key={item.id} className={`flex flex-col p-6 rounded-2xl border transition-all ${cartItem ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-100'}`}>
                  <h4 className="font-bold text-slate-800 text-lg leading-tight truncate">{item.name}</h4>
                  <p className="text-[12px] font-bold text-indigo-600 uppercase tracking-widest mt-1 mb-6">Rs. {Number(item.price).toFixed(2)}</p>
                  <div className="mt-auto">
                    {cartItem ? (
                      <div className="flex items-center gap-4 bg-white px-3 py-1.5 rounded-xl border border-indigo-100 shadow-sm w-fit">
                        <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 text-indigo-600 font-bold">-</button>
                        <span className="text-sm font-bold w-4 text-center">{cartItem.quantity}</span>
                        <button onClick={() => addToCart(item)} className="w-8 h-8 text-indigo-600 font-bold">+</button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(item)} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold">Add to Tray</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-4 sticky top-28">
          <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 text-white overflow-hidden flex flex-col min-h-[500px]">
            <div className="p-8 border-b border-white/5 bg-white/5 flex justify-between items-center"><h3 className="text-lg font-bold flex items-center gap-2"><ShoppingBag size={20} className="text-indigo-400" /> Current Tray</h3></div>
            <div className="flex-1 p-8 overflow-y-auto space-y-6">
              {cart.map(item => (
                <div key={item.menuItemId} className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-100">{item.quantity}x {item.name}</span>
                  <span className="text-sm font-bold text-emerald-400">Rs. {(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="p-8 bg-black/40 border-t border-white/5">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Total Bill</span>
                  <span className="text-3xl font-bold text-white">Rs. {cart.reduce((a, b) => a + (b.price * b.quantity), 0).toFixed(2)}</span>
                </div>
              </div>
              <button 
                onClick={submitOrder} 
                disabled={cart.length === 0 || isSubmitting} 
                className="w-full py-5 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl disabled:opacity-20 uppercase tracking-widest text-xs"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Send to Kitchen'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitressDashboard;
