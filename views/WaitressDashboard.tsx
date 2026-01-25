
import React, { useState, useMemo } from 'react';
import { Table, MenuItem, Order, TableStatus, OrderStatus, OrderItem } from '../types.ts';
import { Users, Clock, Plus, Minus, Send, ShoppingBag, Search, Hash } from 'lucide-react';
import { supabase } from '../supabaseClient.ts';

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
  const [searchQuery, setSearchQuery] = useState('');

  // Assign numbers to items and filter based on search
  const filteredMenu = useMemo(() => {
    const itemsWithNumbers = menu.map((item, index) => ({
      ...item,
      displayNumber: (index + 1).toString().padStart(2, '0')
    }));

    if (!searchQuery.trim()) return itemsWithNumbers;

    const query = searchQuery.toLowerCase();
    return itemsWithNumbers.filter(item => 
      item.name.toLowerCase().includes(query) || 
      item.displayNumber.includes(query) ||
      item.category.toLowerCase().includes(query)
    ).sort((a, b) => {
      // Prioritize exact number matches or starts-with name matches
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      if (a.displayNumber === query) return -1;
      if (b.displayNumber === query) return 1;
      if (aName.startsWith(query) && !bName.startsWith(query)) return -1;
      if (!aName.startsWith(query) && bName.startsWith(query)) return 1;
      return 0;
    });
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
      setSearchQuery(''); // Clear search for next table
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
        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
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
                disabled={table.status !== TableStatus.AVAILABLE && !activeOrder}
                className={`p-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden group ${
                  selectedTable?.id === table.id 
                    ? 'border-indigo-600 bg-indigo-50 shadow-md ring-4 ring-indigo-50' 
                    : table.status === TableStatus.AVAILABLE 
                      ? 'border-slate-200 bg-white hover:border-indigo-300' 
                      : 'border-amber-100 bg-amber-50 cursor-default'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-lg font-bold ${table.status === TableStatus.AVAILABLE ? 'text-slate-800' : 'text-amber-700'}`}>
                    T-{table.number}
                  </span>
                  <div className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    table.status === TableStatus.AVAILABLE ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-200 text-amber-800'
                  }`}>
                    {table.status}
                  </div>
                </div>
                
                {activeOrder ? (
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-1 text-[10px] text-amber-600 font-bold uppercase tracking-tighter">
                      <Clock size={12} />
                      {Math.floor((Date.now() - activeOrder.timestamp) / 60000)}m
                    </div>
                    {activeOrder.status === OrderStatus.READY && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); markServed(activeOrder); }}
                        className="w-full py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-700 transition-all shadow-sm"
                      >
                        Serve Now
                      </button>
                    )}
                    {activeOrder.status === OrderStatus.SERVED && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); markDone(activeOrder); }}
                        className="w-full py-2 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-900 transition-all shadow-sm"
                      >
                        Done
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    Take Order
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 flex flex-col min-h-[600px] overflow-hidden">
        {selectedTable ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-slate-50">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Table {selectedTable.number}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Order Creation</p>
                </div>
                <button 
                  onClick={() => { setSelectedTable(null); setCart([]); }}
                  className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or number (e.g. 05)..."
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm transition-all"
                  autoFocus
                />
              </div>
            </div>

            {/* Menu Items List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
              {filteredMenu.length > 0 ? (
                filteredMenu.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-2xl hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-500/5 transition-all group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-black shrink-0 border border-indigo-100">
                        {item.displayNumber}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">{item.name}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">${item.price.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${
                          cart.find(i => i.menuItemId === item.id) 
                            ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' 
                            : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                        }`}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center font-black text-sm text-slate-700">
                        {cart.find(i => i.menuItemId === item.id)?.quantity || 0}
                      </span>
                      <button 
                        onClick={() => addToCart(item)}
                        className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 opacity-50">
                  <p className="text-sm font-bold text-slate-400">No items found</p>
                </div>
              )}
            </div>

            {/* Footer / Submit */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={18} className="text-slate-400" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">Subtotal</span>
                </div>
                <span className="text-2xl font-black text-slate-900">
                  ${cart.reduce((acc, curr) => acc + curr.price * curr.quantity, 0).toFixed(2)}
                </span>
              </div>
              <button 
                onClick={submitOrder}
                disabled={cart.length === 0 || isSubmitting}
                className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all disabled:opacity-50 uppercase tracking-widest text-sm"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <Send size={18} />
                    Place Order
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-slate-50/30">
            <div className="w-20 h-20 bg-white shadow-xl shadow-slate-200/50 rounded-[32px] flex items-center justify-center text-slate-200 mb-6 border border-slate-50">
              <ShoppingBag size={36} />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Select a Table</h3>
            <p className="text-sm text-slate-400 mt-2 font-medium max-w-[200px]">Choose an available table from the layout to start a new order.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Simple Close Icon missing from previous imports
const X = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const Loader2 = ({ className, size }: { className?: string, size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
  </svg>
);

export default WaitressDashboard;
