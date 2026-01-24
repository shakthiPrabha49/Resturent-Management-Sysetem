
import React, { useState } from 'react';
import { Order, OrderStatus, TableStatus, StockEntry } from '../types.ts';
import { ChefHat, ClipboardCheck, Timer, Package, CheckCircle2, Plus, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient.ts';

interface ChefDashboardProps {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  stock: StockEntry[];
  setStock: React.Dispatch<React.SetStateAction<StockEntry[]>>;
  deductStock: (itemName: string, quantity: number) => void;
  updateTableStatus: (tableId: string, status: TableStatus) => void;
}

const ChefDashboard: React.FC<ChefDashboardProps> = ({ 
  orders, stock, deductStock, updateTableStatus 
}) => {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const activeOrders = orders.filter(o => [OrderStatus.PENDING, OrderStatus.COOKING, OrderStatus.READY].includes(o.status) && o.status !== OrderStatus.PAID);

  const handleUpdateItemStatus = async (order: Order, menuItemId: string, status: 'Cooking' | 'Completed') => {
    setUpdatingId(`${order.id}-${menuItemId}`);
    
    const updatedItems = order.items.map(item => {
      if (item.menuItemId === menuItemId) {
        if (status === 'Completed' && item.status !== 'Completed') {
          const ingredient = item.name.toLowerCase().includes('pizza') ? 'Mozzarella' : item.name.toLowerCase().includes('pasta') ? 'Pasta' : 'Tomato';
          deductStock(ingredient, 1);
        }
        return { ...item, status };
      }
      return item;
    });

    const completedCount = updatedItems.filter(i => i.status === 'Completed').length;
    const isFinished = completedCount === updatedItems.length;

    let newOrderStatus = order.status;
    if (status === 'Cooking' && order.status === OrderStatus.PENDING) {
      newOrderStatus = OrderStatus.COOKING;
      await updateTableStatus(order.tableId, TableStatus.COOKING);
    }
    if (isFinished) {
      newOrderStatus = OrderStatus.READY;
      await updateTableStatus(order.tableId, TableStatus.READY);
    }

    const { error } = await supabase
      .from('orders')
      .update({ items: updatedItems, status: newOrderStatus })
      .eq('id', order.id);

    if (error) console.error("Chef update error:", error);
    setUpdatingId(null);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
      <div className="xl:col-span-3 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ChefHat size={22} className="text-indigo-600" />
            Kitchen Queue
          </h2>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100">
            {activeOrders.length} TICKETS
          </span>
        </div>

        {activeOrders.length === 0 ? (
          <div className="bg-white rounded-[32px] p-20 text-center border-2 border-dashed border-slate-100">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClipboardCheck size={32} className="text-slate-300" />
            </div>
            <p className="text-slate-400 font-medium">Kitchen is quiet. All orders served!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeOrders.map(order => {
              const completedCount = order.items.filter(i => i.status === 'Completed').length;
              const progress = (completedCount / order.items.length) * 100;

              return (
                <div key={order.id} className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 flex flex-col hover:shadow-xl hover:shadow-indigo-500/5 transition-all">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-lg font-black text-slate-800 tracking-tight">Table {order.tableNumber}</h3>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        <Timer size={12} />
                        In {Math.floor((Date.now() - order.timestamp) / 60000)}m
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-tighter ${
                      order.status === OrderStatus.PENDING ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-6">
                    <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${progress}%` }} />
                  </div>

                  <div className="flex-1 space-y-2.5">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl group border border-transparent hover:border-slate-200 hover:bg-white transition-all">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 flex items-center justify-center bg-white text-indigo-600 font-black rounded-lg text-sm border border-slate-100">
                            {item.quantity}
                          </span>
                          <span className={`font-bold text-sm ${item.status === 'Completed' ? 'line-through text-slate-300' : 'text-slate-700'}`}>
                            {item.name}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {updatingId === `${order.id}-${item.menuItemId}` ? (
                            <Loader2 size={20} className="animate-spin text-slate-300" />
                          ) : (
                            <>
                              {item.status === 'Pending' && (
                                <button onClick={() => handleUpdateItemStatus(order, item.menuItemId, 'Cooking')} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-indigo-700 transition-colors shadow-sm">
                                  Start
                                </button>
                              )}
                              {item.status === 'Cooking' && (
                                <button onClick={() => handleUpdateItemStatus(order, item.menuItemId, 'Completed')} className="px-4 py-1.5 bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase hover:bg-emerald-600 transition-colors shadow-sm">
                                  Finish
                                </button>
                              )}
                              {item.status === 'Completed' && <CheckCircle2 size={22} className="text-emerald-500 drop-shadow-sm" />}
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

      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 h-fit">
        <h3 className="text-lg font-bold flex items-center gap-2 mb-8">
          <Package size={20} className="text-indigo-600" />
          Stock Monitor
        </h3>
        <div className="space-y-5">
          {['Mozzarella', 'Pasta', 'Tomato'].map(itemName => {
            const itemStock = stock.filter(s => s.itemName === itemName);
            const totalQty = itemStock.reduce((acc, curr) => acc + curr.quantity, 0);
            const isLow = totalQty < 15;

            return (
              <div key={itemName} className="p-5 rounded-3xl bg-slate-50 border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-700">{itemName}</span>
                  <span className={`text-xs font-black ${isLow ? 'text-rose-600 animate-pulse' : 'text-slate-500'}`}>
                    {totalQty} U
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-1000 ${isLow ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min((totalQty / 150) * 100, 100)}%` }} />
                </div>
                {itemStock.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-1">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">FIFO Queue</p>
                    {itemStock.map(batch => (
                      <div key={batch.id} className="flex justify-between text-[10px] font-medium text-slate-500">
                        <span>{new Date(batch.purchaseDate).toLocaleDateString()}</span>
                        <span className="font-bold">Qty: {batch.quantity}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button className="w-full mt-8 py-4 border-2 border-dashed border-slate-200 rounded-[20px] text-slate-400 hover:text-indigo-600 hover:border-indigo-200 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
          <Plus size={16} />
          Restock Request
        </button>
      </div>
    </div>
  );
};

export default ChefDashboard;
