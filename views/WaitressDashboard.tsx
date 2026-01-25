
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Table, MenuItem, Order, TableStatus, OrderStatus, OrderItem, User } from '../types.ts';
import { Users, Clock, Plus, Minus, Send, ShoppingBag, Search, Loader2, X, Lock, Bell, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabaseClient.ts';

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
  
  // Ref to track previous table statuses to detect changes
  const prevTableStatuses = useRef<Record<string, TableStatus>>({});

  // Monitor tables for "READY" status changes
  useEffect(() => {
    tables.forEach(table => {
      const prevStatus = prevTableStatuses.current[table.id];
      
      // If table just became READY and belongs to this waitress
      if (
        table.status === TableStatus.READY && 
        prevStatus !== TableStatus.READY && 
        table.waitress_name === currentUser.name
      ) {
        const newNotif: ChefNotification = {
          id: Math.random().toString(36).substr(2, 9),
          tableNumber: table.number,
          message: `Table T-${table.number} cooking finished!`
        };
        setActiveNotifications(prev => [...prev, newNotif]);
        
        // Also log to console/app-wide notifications
        addNotification(`T-${table.number} is READY`);
      }
      
      // Update ref for next run
      prevTableStatuses.current[table.id] = table.status;
    });
  }, [tables, currentUser.name, addNotification]);

  const dismissNotification = (id: string) => {
    setActiveNotifications(prev => prev.filter(n => n.id !== id));
  };

  const activeOrderForSelected = useMemo(() => {
    if (!selectedTable) return null;
    return orders.find(o => o.table_id === selectedTable.id && o.status !== OrderStatus.PAID);
  }, [selectedTable, orders]);

  const filteredMenu = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return menu.filter(item => 
      item.name.toLowerCase().includes(query) || 
      item.item_number?.toLowerCase().includes(query)
    );
  }, [menu, searchQuery]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuItemId === item.id);
      if (existing) {
        return prev.map(i => i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { menuItemId: item.id, name: item.name, quantity: 1, price: item.price, status: 'Pending' }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuItemId === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.menuItemId === itemId ? { ...i, quantity: i.quantity - 1 } : i);
      }
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
        
        const { error: orderError } = await supabase
          .from('orders')
          .update({ 
            items: updatedItems, 
            total: updatedTotal, 
            status: OrderStatus.PENDING 
          })
          .eq('id', activeOrderForSelected.id);

        if (orderError) throw orderError;
        await updateTableStatus(selectedTable.id, TableStatus.ORDERING, currentUser.name);
      } else {
        const newOrderData = {
          id: Math.random().toString(36).substr(2, 9),
          table_id: selectedTable.id,
          table_number: selectedTable.number,
          items: cart,
          status: OrderStatus.PENDING,
          timestamp: Date.now(),
          total: cartTotal,
          waitress_name: currentUser.name
        };

        const { error: insertError } = await supabase.from('orders').insert([newOrderData]);
        if (insertError) throw insertError;
        await updateTableStatus(selectedTable.id, TableStatus.ORDERING, currentUser.name);
      }
      
      setCart([]);
      setSelectedTable(null);
      setSearchQuery('');
    } catch (err: any) {
      console.error("Critical Order Error:", err);
      alert(`Database Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const finishTable = async (table: Table) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('tables')
        .update({ status: TableStatus.COMPLETED })
        .eq('id', table.id);

      if (error) throw error;
      setSelectedTable(null);
    } catch (err: any) {
      alert(`Finalize Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      {/* Real-time Chef Notifications */}
      <div className="fixed top-24 right-8 z-[100] space-y-4 pointer-events-none w-80">
        {activeNotifications.map(notif => (
          <div 
            key={notif.id} 
            className="pointer-events-auto bg-white border-l-4 border-emerald-500 p-5 rounded-2xl shadow-2xl animate-in slide-in-from-right duration-300 flex items-start gap-4 ring-1 ring-slate-900/5"
          >
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <Bell size={24} className="animate-bounce" />
            </div>
            <div className="flex-1">
              <h4 className="font-black text-slate-900 text-sm">Order Ready!</h4>
              <p className="text-xs text-slate-500 mt-1 font-medium">{notif.message}</p>
              <button 
                onClick={() => dismissNotification(notif.id)}
                className="mt-3 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg transition-all"
              >
                Dismiss
              </button>
            </div>
            <button 
              onClick={() => dismissNotification(notif.id)}
              className="text-slate-300 hover:text-slate-500"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <Users size={20} className="text-indigo-600" />
              Active Floor Map
            </h2>
            <div className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500">
               Staff: {currentUser.name}
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {tables.map(table => {
              const isSelected = selectedTable?.id === table.id;
              const isAssignedToOther = table.waitress_name && table.waitress_name !== currentUser.name;
              
              return (
                <button
                  key={table.id}
                  disabled={isAssignedToOther && table.status !== TableStatus.AVAILABLE}
                  onClick={() => setSelectedTable(table)}
                  className={`p-5 rounded-[28px] border-2 transition-all text-left relative overflow-hidden group ${
                    isSelected 
                      ? 'border-indigo-600 bg-indigo-50 shadow-xl ring-4 ring-indigo-50' 
                      : isAssignedToOther
                        ? 'border-slate-100 bg-slate-50/50 grayscale opacity-40 cursor-not-allowed'
                        : table.status === TableStatus.AVAILABLE 
                          ? 'border-slate-100 bg-white hover:border-indigo-200 shadow-sm' 
                          : table.status === TableStatus.COMPLETED
                            ? 'border-emerald-200 bg-emerald-50'
                            : table.status === TableStatus.READY
                              ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500 ring-offset-2'
                              : 'border-amber-100 bg-amber-50/50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-xl font-black ${table.status === TableStatus.AVAILABLE ? 'text-slate-800' : 'text-slate-900'}`}>
                      T-{table.number}
                    </span>
                    <div className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                      table.status === TableStatus.AVAILABLE ? 'bg-slate-100 text-slate-500' : 
                      table.status === TableStatus.READY ? 'bg-emerald-600 text-white' :
                      table.status === TableStatus.COMPLETED ? 'bg-emerald-500 text-white' : 'bg-amber-200 text-amber-800'
                    }`}>
                      {table.status}
                    </div>
                  </div>

                  {table.waitress_name && (
                     <div className="mb-4 flex items-center gap-1.5">
                       <div className={`w-1.5 h-1.5 rounded-full ${table.status === TableStatus.READY ? 'bg-emerald-500 animate-ping' : 'bg-indigo-500'}`}></div>
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter truncate max-w-[100px]">
                         {isAssignedToOther ? `Assigned: ${table.waitress_name}` : 'My Active Table'}
                       </span>
                     </div>
                  )}

                  {table.status !== TableStatus.AVAILABLE && !isAssignedToOther && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
                        {table.status === TableStatus.READY ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Clock size={12} className="text-indigo-500" />}
                        {table.status === TableStatus.READY ? 'Ready to Serve' : 'Tracking'}
                      </div>
                      {table.status !== TableStatus.COMPLETED && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); finishTable(table); }}
                          className="w-full py-2 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-lg"
                        >
                          Finish Bill
                        </button>
                      )}
                    </div>
                  )}
                  
                  {isAssignedToOther && (
                    <div className="mt-4 flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase">
                      <Lock size={12} /> Occupied
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 flex flex-col min-h-[600px] overflow-hidden">
          {selectedTable ? (
            <div className="flex flex-col h-full">
              <div className="p-8 border-b border-slate-50 bg-slate-50/30">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Table T-{selectedTable.number}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {activeOrderForSelected ? 'Existing Order' : 'New Ticket'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setSelectedTable(null); setCart([]); }}
                    className="p-3 hover:bg-white rounded-2xl text-slate-400 hover:text-slate-600 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type item name or code..."
                    className="w-full pl-12 pr-5 py-4 bg-white border border-slate-200 rounded-[22px] outline-none font-bold text-sm shadow-sm"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-white">
                {filteredMenu.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-3xl border border-slate-100 hover:border-indigo-100 hover:bg-white transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 text-white text-xs font-black shadow-lg">
                        {item.item_number || '??'}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-sm">{item.name}</p>
                        <p className="text-[10px] font-bold text-indigo-500 tracking-wider">${Number(item.price).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => removeFromCart(item.id)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 transition-all active:scale-95"><Minus size={16} /></button>
                      <span className="w-5 text-center font-black text-sm text-slate-900">{cart.find(i => i.menuItemId === item.id)?.quantity || 0}</span>
                      <button onClick={() => addToCart(item)} className="w-9 h-9 flex items-center justify-center bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-xl transition-all active:scale-95"><Plus size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50/50">
                <div className="flex justify-between items-center mb-6 px-2">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">Ticket Total</span>
                  <span className="text-3xl font-black text-slate-900">
                    ${cart.reduce((acc, curr) => acc + curr.price * curr.quantity, 0).toFixed(2)}
                  </span>
                </div>
                
                <button 
                  onClick={submitOrder}
                  disabled={cart.length === 0 || isSubmitting}
                  className="w-full py-5 bg-indigo-600 text-white font-black rounded-[24px] shadow-2xl flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all disabled:opacity-50 uppercase tracking-[0.2em] text-xs"
                >
                  {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <><Send size={18} /> Send to Kitchen</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6">
              <div className="w-24 h-24 bg-indigo-50 rounded-[40px] flex items-center justify-center text-indigo-200 border border-indigo-100/50">
                <ShoppingBag size={48} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Ordering System</h3>
                <p className="text-sm text-slate-400 mt-2 font-medium max-w-[240px] mx-auto">Select a table from the map to begin taking an order.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WaitressDashboard;
