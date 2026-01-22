
import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, UserRole, Table, MenuItem, Order, StockEntry, Transaction, TableStatus, OrderStatus 
} from './types';
import { INITIAL_USERS, INITIAL_TABLES, INITIAL_MENU, INITIAL_STOCK } from './constants';
import Login from './views/Login';
import OwnerDashboard from './views/OwnerDashboard';
import CashierDashboard from './views/CashierDashboard';
import ChefDashboard from './views/ChefDashboard';
import WaitressDashboard from './views/WaitressDashboard';
import Sidebar from './components/Sidebar';
import { LogOut, Bell } from 'lucide-react';

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Global Restaurant State
  const [tables, setTables] = useState<Table[]>(INITIAL_TABLES);
  const [menu, setMenu] = useState<MenuItem[]>(INITIAL_MENU);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stock, setStock] = useState<StockEntry[]>(INITIAL_STOCK);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);

  // Helpers
  const addNotification = useCallback((msg: string) => {
    setNotifications(prev => [msg, ...prev].slice(0, 5));
    // Simulate real-time toast or sound in a real app
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    addNotification(`Welcome back, ${user.name}!`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  // Logic: Update Table Status
  const updateTableStatus = useCallback((tableId: string, status: TableStatus) => {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, status } : t));
  }, []);

  // Logic: FIFO Stock Deduction
  const deductStock = useCallback((itemName: string, quantity: number) => {
    setStock(prev => {
      let remaining = quantity;
      const sortedStock = [...prev].sort((a, b) => a.purchaseDate - b.purchaseDate);
      
      const newStock = sortedStock.map(entry => {
        if (entry.itemName === itemName && remaining > 0) {
          const toDeduct = Math.min(entry.quantity, remaining);
          remaining -= toDeduct;
          return { ...entry, quantity: entry.quantity - toDeduct };
        }
        return entry;
      }).filter(entry => entry.quantity > 0);

      if (remaining > 0) {
        addNotification(`Low stock warning: ${itemName} is out!`);
      }
      return newStock;
    });
  }, [addNotification]);

  // Logic: Billing & Payment
  const processPayment = useCallback((orderId: string, amount: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'IN',
      amount,
      description: `Payment for Table ${order.tableNumber}`,
      timestamp: Date.now(),
      category: 'Sales'
    };

    setTransactions(prev => [...prev, newTransaction]);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: OrderStatus.PAID } : o));
    updateTableStatus(order.tableId, TableStatus.AVAILABLE);
    addNotification(`Payment received for Table ${order.tableNumber}`);
  }, [orders, updateTableStatus, addNotification]);

  // Logic: Cash Book Expense
  const addExpense = useCallback((amount: number, description: string) => {
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'OUT',
      amount,
      description,
      timestamp: Date.now(),
      category: 'Expense'
    };
    setTransactions(prev => [...prev, newTransaction]);
    addNotification(`Expense recorded: ${description}`);
  }, [addNotification]);

  if (!currentUser) {
    return <Login onLogin={handleLogin} users={INITIAL_USERS} />;
  }

  const renderDashboard = () => {
    switch (currentUser.role) {
      case UserRole.OWNER:
        return (
          <OwnerDashboard 
            orders={orders} 
            transactions={transactions} 
            stock={stock}
            menu={menu}
            setMenu={setMenu}
          />
        );
      case UserRole.CASHIER:
        return (
          <CashierDashboard 
            orders={orders} 
            processPayment={processPayment} 
            transactions={transactions}
            addExpense={addExpense}
          />
        );
      case UserRole.CHEF:
        return (
          <ChefDashboard 
            orders={orders} 
            setOrders={setOrders} 
            stock={stock} 
            setStock={setStock}
            deductStock={deductStock}
            updateTableStatus={updateTableStatus}
          />
        );
      case UserRole.WAITRESS:
        return (
          <WaitressDashboard 
            tables={tables} 
            menu={menu} 
            orders={orders}
            setOrders={setOrders}
            updateTableStatus={updateTableStatus}
            addNotification={addNotification}
          />
        );
      default:
        return <div>Access Denied</div>;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar Navigation */}
      <Sidebar role={currentUser.role} onLogout={handleLogout} userName={currentUser.name} />

      {/* Main Content Area */}
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">GustoFlow</h1>
            <p className="text-sm text-slate-500">{currentUser.role} Dashboard</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors relative">
                <Bell size={20} className="text-slate-600" />
                {notifications.length > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 bg-rose-500 rounded-full text-[10px] text-white flex items-center justify-center border-2 border-white">
                    {notifications.length}
                  </span>
                )}
              </button>
            </div>
            
            <div className="h-8 w-[1px] bg-slate-200" />
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold">{currentUser.name}</p>
                <p className="text-xs text-slate-400 capitalize">{currentUser.role.toLowerCase()}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {renderDashboard()}
        </div>
      </main>
    </div>
  );
};

export default App;
