
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Table, MenuItem, Order, TableStatus, OrderStatus, OrderItem, User } from '../types.ts';
import { Users, Clock, Plus, Minus, Send, ShoppingBag, Search, Loader2, X, Lock, Bell, CheckCircle2 } from 'lucide-react';
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
    <div className="relative">
      <div className="fixed top-24 right-8 z-[100] space-y-4 pointer-events-none w-80">
        {activeNotifications.map(notif => (
          <div key={notif.id} className="pointer-events-auto bg-white border-l-4 border-emerald-500 p-5 rounded-2xl shadow-2xl flex items-start gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Bell size={24} className="animate-bounce" /></div>
            <div className="flex-1"><h4 className="font-black text-slate-900 text-sm">Order Ready!</h4><p className="text-xs text-slate-500 mt-1">{notif.message}</p></div>
            <button onClick={() => setActiveNotifications(p => p.filter(n => n.id !== notif.id))}><X size={16} /></button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {tables.map(table => (
              <button key={table.id} onClick={() => setSelectedTable(table)} className={`p-5 rounded-[28px] border-2 transition-all text-left ${selectedTable?.id === table.id ? 'border-indigo-600 bg-indigo-50' : 'bg-white border-slate-100'}`}>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xl font-black">T-{table.number}</span>
                  <div className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-slate-100 text-slate-500">{table.status}</div>
                </div>
                {table.status !== TableStatus.AVAILABLE && (
                  <button onClick={(e) => { e.stopPropagation(); db.from('tables').update({ status: TableStatus.COMPLETED }).eq('id', table.id); }} className="w-full py-2 bg-slate-900 text-white text-[9px] font-black uppercase rounded-xl">Finish Bill</button>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[40px] shadow-2xl flex flex-col min-h-[600px] overflow-hidden">
          {selectedTable ? (
            <div className="flex flex-col h-full">
              <div className="p-8 border-b bg-slate-50/30">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-black">Table T-{selectedTable.number}</h3>
                  <button onClick={() => setSelectedTable(null)}><X size={20} /></button>
                </div>
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search menu..." className="w-full p-4 border rounded-2xl" />
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {filteredMenu.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-3xl">
                    <div><p className="font-black text-sm">{item.name}</p><p className="text-[10px] text-indigo-500">${item.price}</p></div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 border rounded-xl">-</button>
                      <span className="font-black">{cart.find(i => i.menuItemId === item.id)?.quantity || 0}</span>
                      <button onClick={() => addToCart(item)} className="w-8 h-8 bg-indigo-600 text-white rounded-xl">+</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-8 border-t">
                <button onClick={submitOrder} disabled={cart.length === 0 || isSubmitting} className="w-full py-5 bg-indigo-600 text-white font-black rounded-[24px]">
                  {isSubmitting ? <Loader2 className="animate-spin" /> : 'Send to Kitchen'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <ShoppingBag size={48} className="text-slate-200 mb-4" />
              <p className="text-slate-400 font-bold">Select a table to start</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WaitressDashboard;
