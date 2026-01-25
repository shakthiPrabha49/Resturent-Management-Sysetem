import React, { useState, useEffect, useRef } from 'react';
import { Order, OrderStatus, TableStatus } from '../types.ts';
import { ChefHat, ClipboardCheck, CheckCircle2, Loader2, Clock } from 'lucide-react';
import { db } from '../db.ts';
import { playSound, SOUNDS } from '../utils/audio.ts';

interface ChefDashboardProps {
  orders: Order[];
  updateTableStatus: (tableId: string, status: TableStatus) => void;
}

const ChefDashboard: React.FC<ChefDashboardProps> = ({ 
  orders, updateTableStatus 
}) => {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const prevOrdersCount = useRef(0);
  const isFirstRender = useRef(true);

  const activeOrders = orders.filter(o => 
    [OrderStatus.PENDING, OrderStatus.COOKING, OrderStatus.READY].includes(o.status) && 
    o.status !== OrderStatus.PAID
  );

  useEffect(() => {
    const pendingCount = orders.filter(o => o.status === OrderStatus.PENDING).length;
    if (!isFirstRender.current && pendingCount > prevOrdersCount.current) {
      playSound(SOUNDS.KITCHEN_BELL);
    }
    prevOrdersCount.current = pendingCount;
    isFirstRender.current = false;
  }, [orders]);

  const handleUpdateItemStatus = async (order: Order, menuItemId: string, status: 'Cooking' | 'Completed') => {
    setUpdatingId(`${order.id}-${menuItemId}`);
    
    const updatedItems = order.items.map(item => {
      if (item.menuItemId === menuItemId) return { ...item, status };
      return item;
    });

    const isFinished = updatedItems.every(i => i.status === 'Completed');

    let newOrderStatus = order.status;
    if (status === 'Cooking' && order.status === OrderStatus.PENDING) {
      newOrderStatus = OrderStatus.COOKING;
      await updateTableStatus(order.table_id, TableStatus.COOKING);
    }
    if (isFinished) {
      newOrderStatus = OrderStatus.READY;
      await updateTableStatus(order.table_id, TableStatus.READY);
    }

    try {
      await db.from('orders').update({ items: updatedItems, status: newOrderStatus }).eq('id', order.id);
    } catch (err) {
      console.error("Chef update error:", err);
    }
    
    setUpdatingId(null);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <ChefHat size={22} className="text-indigo-600" />
            Kitchen Display System
          </h2>
          <p className="text-sm text-slate-500 font-medium">Real-time order tracking for kitchen staff.</p>
        </div>
        <span className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100 flex items-center gap-2 shadow-sm">
          <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
          {activeOrders.length} OPEN TICKETS
        </span>
      </div>

      {activeOrders.length === 0 ? (
        <div className="bg-white rounded-xl py-24 text-center border border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardCheck size={32} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No active orders</h3>
          <p className="text-slate-400 font-medium max-w-xs mx-auto mt-1">Kitchen queue is clear. New orders will appear here automatically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          {activeOrders.map(order => {
            const completedCount = order.items.filter(i => i.status === 'Completed').length;
            const progress = (completedCount / order.items.length) * 100;

            return (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden transition-all hover:shadow-md">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 leading-none">Table T-{order.table_number}</h3>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-2">
                        <Clock size={12} />
                        Ordered {Math.floor((Date.now() - order.timestamp) / 60000)}m ago
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                      order.status === OrderStatus.PENDING ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                    }`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-4">
                    <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="p-5 flex-1 space-y-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg transition-all">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 flex items-center justify-center bg-slate-50 text-indigo-600 font-bold rounded text-xs border border-slate-100">
                          {item.quantity}x
                        </span>
                        <span className={`font-semibold text-sm ${item.status === 'Completed' ? 'line-through text-slate-300' : 'text-slate-700'}`}>
                          {item.name}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {updatingId === `${order.id}-${item.menuItemId}` ? (
                          <Loader2 size={18} className="animate-spin text-slate-300" />
                        ) : (
                          <>
                            {item.status === 'Pending' && (
                              <button onClick={() => handleUpdateItemStatus(order, item.menuItemId, 'Cooking')} className="px-3 py-1 bg-indigo-600 text-white rounded text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-700 transition-colors">
                                Prep
                              </button>
                            )}
                            {item.status === 'Cooking' && (
                              <button onClick={() => handleUpdateItemStatus(order, item.menuItemId, 'Completed')} className="px-3 py-1 bg-emerald-500 text-white rounded text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-600 transition-colors">
                                Done
                              </button>
                            )}
                            {item.status === 'Completed' && <CheckCircle2 size={20} className="text-emerald-500" />}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChefDashboard;