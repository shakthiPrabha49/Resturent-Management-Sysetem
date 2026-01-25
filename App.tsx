import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  User, UserRole, Table, MenuItem, Order, StockEntry, Transaction, TableStatus, OrderStatus, AppSettings 
} from './types.ts';
import Login from './views/Login.tsx';
import OwnerDashboard from './views/OwnerDashboard.tsx';
import CashierDashboard from './views/CashierDashboard.tsx';
import ChefDashboard from './views/ChefDashboard.tsx';
import WaitressDashboard from './views/WaitressDashboard.tsx';
import WaitressOrdersView from './views/WaitressOrdersView.tsx';
import CustomerDataView from './views/CustomerData.tsx';
import SettingsView from './views/Settings.tsx';
import Sidebar from './components/Sidebar.tsx';
import { LogOut, Menu, X } from 'lucide-react';
import { db } from './db.ts';

const SETTINGS_KEY = 'gustoflow_local_settings';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stock, setStock] = useState<StockEntry[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<string>('Dashboard');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const pollInterval = useRef<any>(null);
  
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const local = localStorage.getItem(SETTINGS_KEY);
    return local ? JSON.parse(local) : {
      id: 'singleton_settings',
      name: 'GustoFlow',
      slogan: 'Cloud-Synced Restaurant Operations',
      logo_url: ''
    };
  });

  const addNotification = useCallback((msg: string) => {
    console.log("App Notification:", msg);
  }, []);

  const fetchData = async () => {
    try {
      const [
        tablesData,
        menuData,
        ordersData,
        stockData,
        transData,
        settingsData
      ] = await Promise.all([
        db.from('tables').select('ORDER BY number'),
        db.from('menu_items').select(),
        db.from('orders').select('ORDER BY timestamp DESC'),
        db.from('stock_entries').select('ORDER BY purchase_date'),
        db.from('transactions').select('ORDER BY timestamp DESC'),
        db.from('app_settings').maybeSingle("id = 'singleton_settings'")
      ]);

      if (tablesData) setTables(tablesData);
      
      // Fix: Use !! to cast to boolean. Ensures items seeded as 1 or true are active by default.
      if (menuData) setMenu(menuData.map((m: any) => ({ 
        ...m, 
        is_available: m.is_available === 1 || m.is_available === true || m.is_available === '1'
      })));

      if (ordersData) setOrders(ordersData.map((o: any) => ({ ...o, items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items })));
      if (stockData) setStock(stockData);
      if (transData) setTransactions(transData);
      
      if (settingsData) {
        setAppSettings(settingsData);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsData));
      }
    } catch (error) {
      console.error("D1 Sync Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    pollInterval.current = setInterval(fetchData, 5000);
    return () => clearInterval(pollInterval.current);
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsSidebarOpen(false);
    setCurrentView('Dashboard');
    setSelectedTable(null);
  };

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    if (view === 'Dashboard') {
      setSelectedTable(null);
    }
  };

  const updateTableStatus = useCallback(async (tableId: string, status: TableStatus, waitressName?: string | null) => {
    const updateData: any = { status };
    if (waitressName !== undefined) updateData.waitress_name = waitressName;
    await db.from('tables').update(updateData).eq('id', tableId);
    fetchData();
  }, []);

  const processPayment = useCallback(async (orderId: string, amount: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const newTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'IN',
      amount,
      description: `Payment Table T-${order.table_number}`,
      timestamp: Date.now(),
      category: 'Sales'
    };
    
    await db.from('transactions').insert([newTransaction]);
    await db.from('orders').update({ status: OrderStatus.PAID }).eq('id', orderId);
    await updateTableStatus(order.table_id, TableStatus.AVAILABLE, null);
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
    await db.from('transactions').insert([newTransaction]);
    fetchData();
  }, []);

  if (!currentUser) return <Login onLogin={handleLogin} appSettings={appSettings} />;
  
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold text-slate-500 font-mono tracking-widest uppercase">Syncing Cloud Database...</p>
      </div>
    </div>
  );

  const renderView = () => {
    if (currentView === 'Settings' && currentUser.role === UserRole.OWNER) {
      return <SettingsView settings={appSettings} onSave={setAppSettings} />;
    }

    if (currentView === 'CustomerData') {
      return <CustomerDataView currentUser={currentUser} />;
    }

    switch (currentUser.role) {
      case UserRole.OWNER:
        return <OwnerDashboard orders={orders} transactions={transactions} stock={stock} menu={menu} setMenu={() => {}} />;
      case UserRole.CASHIER:
        return <CashierDashboard orders={orders} processPayment={processPayment} transactions={transactions} addExpense={addExpense} tables={tables} />;
      case UserRole.CHEF:
        return <ChefDashboard orders={orders} updateTableStatus={updateTableStatus} />;
      case UserRole.WAITRESS:
        if (currentView === 'MyOrders') {
          return <WaitressOrdersView currentUser={currentUser} orders={orders} />;
        }
        return (
          <WaitressDashboard 
            currentUser={currentUser} 
            tables={tables} 
            menu={menu} 
            orders={orders} 
            updateTableStatus={updateTableStatus} 
            addNotification={addNotification}
            selectedTable={selectedTable}
            setSelectedTable={setSelectedTable}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 relative overflow-x-hidden">
      <Sidebar 
        role={currentUser.role} 
        onLogout={() => setCurrentUser(null)} 
        userName={currentUser.name} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        onViewChange={handleViewChange}
        activeView={currentView}
        appSettings={appSettings}
      />
      
      <main className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:ml-64' : 'ml-0'} p-4 md:p-8 overflow-y-auto w-full`}>
        <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-slate-100 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all">
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="hidden sm:block">
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">{appSettings.name}</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {currentView === 'MyOrders' ? 'My Performance' : (currentUser.role === UserRole.OWNER && currentView === 'Settings' ? 'Application Configuration' : `${currentUser.role} Control Panel`)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-slate-700">{currentUser.name}</p>
              <div className="flex items-center justify-end gap-1">
                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                 <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">D1 Cloud Active</p>
              </div>
            </div>
            <button onClick={() => setCurrentUser(null)} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <div className="animate-in fade-in duration-700">
          {renderView()}
        </div>
      </main>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}
    </div>
  );
};

export default App;