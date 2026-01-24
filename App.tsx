
import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, UserRole, Table, MenuItem, Order, StockEntry, Transaction, TableStatus, OrderStatus 
} from './types.ts';
import { INITIAL_USERS } from './constants.tsx';
import Login from './views/Login.tsx';
import OwnerDashboard from './views/OwnerDashboard.tsx';
import CashierDashboard from './views/CashierDashboard.tsx';
import ChefDashboard from './views/ChefDashboard.tsx';
import WaitressDashboard from './views/WaitressDashboard.tsx';
import Sidebar from './components/Sidebar.tsx';
import { LogOut, Bell } from 'lucide-react';
import { supabase } from './supabaseClient.ts';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stock, setStock] = useState<StockEntry[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const addNotification = useCallback((msg: string) => {
    setNotifications(prev => [msg, ...prev].slice(0, 5));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [
          { data: tablesData },
          { data: menuData },
          { data: ordersData },
          { data: stockData },
          { data: transData }
        ] = await Promise.all([
          supabase.from('tables').select('*').order('number'),
          supabase.from('menu_items').select('*'),
          supabase.from('orders').select('*').order('timestamp', { ascending: false }),
          supabase.from('stock_entries').select('*').order('purchaseDate'),
          supabase.from('transactions').select('*').order('timestamp', { ascending: false })
        ]);

        if (tablesData) setTables(tablesData);
        if (menuData) setMenu(menuData);
        if (ordersData) setOrders(ordersData);
        if (stockData) setStock(stockData);
        if (transData) setTransactions(transData);
      } catch (error) {
        console.error("Critical Sync Error:", error);
        addNotification("Failed to connect to cloud database.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Real-time Subscriptions
    const tableSub = supabase.channel('tables').on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, payload => {
      setTables(curr => curr.map(t => t.id === payload.new.id ? payload.new as Table : t));
    }).subscribe();

    const menuSub = supabase.channel('menu').on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, payload => {
      setMenu(curr => {
        if (payload.eventType === 'UPDATE') return curr.map(m => m.id === payload.new.id ? payload.new as MenuItem : m);
        if (payload.eventType === 'INSERT') return [...curr, payload.new as MenuItem];
        return curr;
      });
    }).subscribe();

    const orderSub = supabase.channel('orders').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
      if (payload.eventType === 'INSERT') {
        setOrders(curr => [payload.new as Order, ...curr]);
        addNotification(`New order for Table ${payload.new.tableNumber}`);
      } else if (payload.eventType === 'UPDATE') {
        setOrders(curr => curr.map(o => o.id === payload.new.id ? payload.new as Order : o));
      }
    }).subscribe();

    const stockSub = supabase.channel('stock').on('postgres_changes', { event: '*', schema: 'public', table: 'stock_entries' }, payload => {
      supabase.from('stock_entries').select('*').order('purchaseDate').then(({ data }) => data && setStock(data));
    }).subscribe();

    const transSub = supabase.channel('trans').on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, payload => {
      if (payload.eventType === 'INSERT') setTransactions(curr => [payload.new as Transaction, ...curr]);
    }).subscribe();

    return () => {
      supabase.removeChannel(tableSub);
      supabase.removeChannel(menuSub);
      supabase.removeChannel(orderSub);
      supabase.removeChannel(stockSub);
      supabase.removeChannel(transSub);
    };
  }, [addNotification]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    addNotification(`Welcome back, ${user.name}!`);
  };

  const updateTableStatus = useCallback(async (tableId: string, status: TableStatus) => {
    await supabase.from('tables').update({ status }).eq('id', tableId);
  }, []);

  const deductStock = useCallback(async (itemName: string, quantity: number) => {
    let remaining = quantity;
    const sortedStock = [...stock].filter(s => s.itemName === itemName).sort((a, b) => a.purchaseDate - b.purchaseDate);
    
    for (const entry of sortedStock) {
      if (remaining <= 0) break;
      const toDeduct = Math.min(entry.quantity, remaining);
      const newQty = entry.quantity - toDeduct;
      if (newQty === 0) {
        await supabase.from('stock_entries').delete().eq('id', entry.id);
      } else {
        await supabase.from('stock_entries').update({ quantity: newQty }).eq('id', entry.id);
      }
      remaining -= toDeduct;
    }
    if (remaining > 0) addNotification(`Warning: ${itemName} is depleted!`);
  }, [stock, addNotification]);

  const processPayment = useCallback(async (orderId: string, amount: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const newTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'IN',
      amount,
      description: `Payment for Table ${order.tableNumber}`,
      timestamp: Date.now(),
      category: 'Sales'
    };
    await Promise.all([
      supabase.from('transactions').insert(newTransaction),
      supabase.from('orders').update({ status: OrderStatus.PAID }).eq('id', orderId),
      updateTableStatus(order.tableId, TableStatus.AVAILABLE)
    ]);
  }, [orders, updateTableStatus]);

  const addExpense = useCallback(async (amount: number, description: string) => {
    const newTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'OUT',
      amount,
      description,
      timestamp: Date.now(),
      category: 'Expense'
    };
    await supabase.from('transactions').insert(newTransaction);
  }, []);

  if (!currentUser) return <Login onLogin={handleLogin} users={INITIAL_USERS} />;
  
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold text-slate-500 font-mono tracking-widest uppercase">GustoFlow Cloud Sync...</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role={currentUser.role} onLogout={() => setCurrentUser(null)} userName={currentUser.name} />
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">GustoFlow</h1>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{currentUser.role} Control Panel</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors relative">
                <Bell size={20} className="text-slate-600" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 bg-rose-500 rounded-full border border-white"></span>
                )}
              </button>
            </div>
            <div className="h-8 w-[1px] bg-slate-100" />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-700">{currentUser.name}</p>
                <div className="flex items-center justify-end gap-1">
                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                   <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Online</p>
                </div>
              </div>
              <button onClick={() => setCurrentUser(null)} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>
        <div className="animate-in fade-in duration-700">
          {currentUser.role === UserRole.OWNER && <OwnerDashboard orders={orders} transactions={transactions} stock={stock} menu={menu} setMenu={setMenu} />}
          {currentUser.role === UserRole.CASHIER && <CashierDashboard orders={orders} processPayment={processPayment} transactions={transactions} addExpense={addExpense} />}
          {currentUser.role === UserRole.CHEF && <ChefDashboard orders={orders} setOrders={setOrders} stock={stock} setStock={setStock} deductStock={deductStock} updateTableStatus={updateTableStatus} />}
          {currentUser.role === UserRole.WAITRESS && <WaitressDashboard tables={tables} menu={menu} orders={orders} setOrders={setOrders} updateTableStatus={updateTableStatus} addNotification={addNotification} />}
        </div>
      </main>
    </div>
  );
};

export default App;
