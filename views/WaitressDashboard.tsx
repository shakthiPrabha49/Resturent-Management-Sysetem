
import React, { useState } from 'react';
import { Table, MenuItem, Order, TableStatus, OrderStatus, OrderItem } from '../types';
import { Users, Clock, Plus, Minus, Send, CheckCircle2, ShoppingBag } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface WaitressDashboardProps {
  tables: Table[];
  menu: MenuItem[];
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  updateTableStatus: (tableId: string, status: TableStatus) => void;
  addNotification: (msg: string) => void;
}

const WaitressDashboard: React.FC<WaitressDashboardProps> = ({ 
  tables, menu, orders, setOrders, updateTableStatus, addNotification 
}) => {
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    const total = cart.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 9),
      tableId: selectedTable.id,
      tableNumber: selectedTable.number,
      items: cart,
      status: OrderStatus.PENDING,
      timestamp: Date.now(),
      total
    };

    const { error } = await supabase.from('orders').insert(newOrder);
    
    if (!error) {
      await updateTableStatus(selectedTable.id, TableStatus.ORDERING);
      addNotification(`Order sent for Table ${selectedTable.number}`);
      setCart([]);
      setSelectedTable(null);
    } else {
      console.error("Submission error:", error);
    }
    setIsSubmitting(false);
  };

  const markServed = async (order: Order) => {
    await supabase.from('orders').update({ status: OrderStatus.SERVED }).eq('id', order.id);
    await updateTableStatus(order.tableId, TableStatus.SERVED);
    addNotification(`Table ${order.tableNumber} served.`);
  };

  const markDone = async (order: Order) => {
    await updateTableStatus(order.tableId, TableStatus.COMPLETED);
    addNotification(`Table ${order.tableNumber} completed. Ready for billing.`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users size={20} className="text-indigo-600" />
          Floor Layout
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {tables.map(table => {
            const activeOrder = orders.find(o => o.tableId === table.id && o.status !== OrderStatus.PAID);
            
            return (
              <button
                key={table.id}
                onClick={() => table.status === TableStatus.AVAILABLE && setSelectedTable(table)}
                disabled={table.status !== TableStatus.AVAILABLE}
                className={`p-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden group ${
                  selectedTable?.id === table.id 
                    ? 'border-indigo-600 bg-indigo-50 shadow-md ring-4 ring-indigo-50' 
                    : table.status === TableStatus.AVAILABLE 
                      ? 'border-slate-200 bg-white hover:border-indigo-300' 
                      : 'border-amber-100 bg-amber-50 cursor-default opacity-90'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-lg font-bold ${table.status === TableStatus.AVAILABLE ? 'text-slate-800' : 'text-amber-700'}`}>
                    T-{table.number}
                  </span>
                  <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    table.status === TableStatus.AVAILABLE ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-200 text-amber-800'
                  }`}>
                    {table.status}
                  </div>
                </div>
                
                {activeOrder ? (
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                      <Clock size={12} />
                      {Math.floor((Date.now() - activeOrder.timestamp) / 60000)}m ago
                    </div>
                    {activeOrder.status === OrderStatus.READY && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); markServed(activeOrder); }}
                        className="w-full py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700"
                      >
                        Serve Food
                      </button>
                    )}
                    {activeOrder.status === OrderStatus.SERVED && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); markDone(activeOrder); }}
                        className="w-full py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-900"
                      >
                        Finish Dining
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 text-[10px] text-slate-400 font-medium">
                    Tap to start order
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col min-h-[600px]">
        {selectedTable ? (
          <div className="flex flex-col h-full p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold">Table {selectedTable.number}</h3>
                <p className="text-sm text-slate-500">Add items to order</p>
              </div>
              <button onClick={() => setSelectedTable(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">Cancel</button>
            </div>
            <div className="flex-1 overflow-y-auto mb-6 pr-2">
              <div className="space-y-4">
                {menu.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 border border-slate-50 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-400">${item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 flex items-center justify-center bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200">
                        <Minus size={14} />
                      </button>
                      <span className="w-4 text-center font-bold text-sm">
                        {cart.find(i => i.menuItemId === item.id)?.quantity || 0}
                      </span>
                      <button onClick={() => addToCart(item)} className="w-7 h-7 flex items-center justify-center bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-6 border-t border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium text-slate-500">Subtotal</span>
                <span className="text-xl font-bold">
                  ${cart.reduce((acc, curr) => acc + curr.price * curr.quantity, 0).toFixed(2)}
                </span>
              </div>
              <button 
                onClick={submitOrder}
                disabled={cart.length === 0 || isSubmitting}
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Send size={18} /> Send to Kitchen</>}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
              <ShoppingBag size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No Table Selected</h3>
            <p className="text-sm text-slate-400">Select an available table to start an order.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaitressDashboard;
