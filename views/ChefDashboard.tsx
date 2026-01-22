
import React from 'react';
import { Order, OrderStatus, TableStatus, StockEntry, OrderItem } from '../types';
// Fixed: Added missing 'Plus' import from lucide-react
import { ChefHat, ClipboardCheck, Timer, Package, CheckCircle2, ChevronRight, Plus } from 'lucide-react';

interface ChefDashboardProps {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  stock: StockEntry[];
  setStock: React.Dispatch<React.SetStateAction<StockEntry[]>>;
  deductStock: (itemName: string, quantity: number) => void;
  updateTableStatus: (tableId: string, status: TableStatus) => void;
}

const ChefDashboard: React.FC<ChefDashboardProps> = ({ 
  orders, setOrders, stock, deductStock, updateTableStatus 
}) => {
  const activeOrders = orders.filter(o => [OrderStatus.PENDING, OrderStatus.COOKING].includes(o.status));

  const updateItemStatus = (orderId: string, menuItemId: string, status: 'Cooking' | 'Completed') => {
    setOrders(prev => {
      return prev.map(order => {
        if (order.id !== orderId) return order;

        const newItems = order.items.map(item => {
          if (item.menuItemId === menuItemId) {
            // If completing, simulate ingredient deduction (FIFO)
            if (status === 'Completed' && item.status !== 'Completed') {
              // Deduct some standard ingredient for this dish (simplification)
              // In real app, map MenuItem to Ingredient list
              const ingredient = item.name.includes('Pizza') ? 'Mozzarella' : item.name.includes('Pasta') ? 'Pasta' : 'Tomato';
              deductStock(ingredient, 1);
            }
            return { ...item, status };
          }
          return item;
        });

        // Calculate progress
        const completedCount = newItems.filter(i => i.status === 'Completed').length;
        const totalItems = newItems.length;
        const isFinished = completedCount === totalItems;

        let newOrderStatus = order.status;
        if (status === 'Cooking' && order.status === OrderStatus.PENDING) {
          newOrderStatus = OrderStatus.COOKING;
          updateTableStatus(order.tableId, TableStatus.COOKING);
        }
        if (isFinished) {
          newOrderStatus = OrderStatus.READY;
          updateTableStatus(order.tableId, TableStatus.READY);
        }

        return { ...order, items: newItems, status: newOrderStatus };
      });
    });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
      {/* Live Orders Queue */}
      <div className="xl:col-span-3 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ChefHat size={22} className="text-orange-600" />
            Kitchen Queue
          </h2>
          <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-bold">
            {activeOrders.length} Active
          </span>
        </div>

        {activeOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClipboardCheck size={32} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">No orders in the kitchen yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeOrders.map(order => {
              const completedCount = order.items.filter(i => i.status === 'Completed').length;
              const progress = (completedCount / order.items.length) * 100;

              return (
                <div key={order.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold">Table {order.tableNumber}</h3>
                      <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                        <Timer size={14} />
                        Ordered {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                      order.status === OrderStatus.PENDING ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-6">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-500" 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>

                  <div className="flex-1 space-y-3">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-indigo-600">x{item.quantity}</span>
                          <span className={`font-semibold ${item.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                            {item.name}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {item.status === 'Pending' && (
                            <button 
                              onClick={() => updateItemStatus(order.id, item.menuItemId, 'Cooking')}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200"
                            >
                              Start
                            </button>
                          )}
                          {item.status === 'Cooking' && (
                            <button 
                              onClick={() => updateItemStatus(order.id, item.menuItemId, 'Completed')}
                              className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-200"
                            >
                              Done
                            </button>
                          )}
                          {item.status === 'Completed' && (
                            <CheckCircle2 size={20} className="text-emerald-500" />
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

      {/* Stock Sidebar (FIFO Info) */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-fit">
        <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
          <Package size={20} className="text-indigo-600" />
          Stock Levels
        </h3>
        <div className="space-y-4">
          {['Mozzarella', 'Pasta', 'Tomato'].map(itemName => {
            const itemStock = stock.filter(s => s.itemName === itemName);
            const totalQty = itemStock.reduce((acc, curr) => acc + curr.quantity, 0);
            const isLow = totalQty < 15;

            return (
              <div key={itemName} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-700">{itemName}</span>
                  <span className={`text-sm font-bold ${isLow ? 'text-rose-600' : 'text-slate-500'}`}>
                    {totalQty} units
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                  <div 
                    className={`h-full transition-all ${isLow ? 'bg-rose-500' : 'bg-indigo-500'}`} 
                    style={{ width: `${Math.min((totalQty / 150) * 100, 100)}%` }} 
                  />
                </div>
                {itemStock.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">FIFO Queue</p>
                    {itemStock.map(batch => (
                      <div key={batch.id} className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-500">{new Date(batch.purchaseDate).toLocaleDateString()}</span>
                        <span className="font-semibold text-slate-600">Qty: {batch.quantity}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <button className="w-full mt-6 py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-slate-600 hover:border-slate-300 text-sm font-bold flex items-center justify-center gap-2 transition-all">
          <Plus size={16} />
          Inventory Request
        </button>
      </div>
    </div>
  );
};

export default ChefDashboard;
