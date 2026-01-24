
import React, { useState } from 'react';
import { Order, OrderStatus, Transaction } from '../types.ts';
import { CreditCard, History, Printer, CheckCircle, Wallet, ArrowUpCircle, ArrowDownCircle, DollarSign } from 'lucide-react';

interface CashierDashboardProps {
  orders: Order[];
  processPayment: (orderId: string, amount: number) => void;
  transactions: Transaction[];
  addExpense: (amount: number, description: string) => void;
}

const CashierDashboard: React.FC<CashierDashboardProps> = ({ 
  orders, processPayment, transactions, addExpense 
}) => {
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');

  const completedOrders = orders.filter(o => o.status === OrderStatus.SERVED || o.status === OrderStatus.READY);
  const todaysSales = transactions.filter(t => t.type === 'IN').reduce((acc, t) => acc + t.amount, 0);
  const todaysExpenses = transactions.filter(t => t.type === 'OUT').reduce((acc, t) => acc + t.amount, 0);
  const netBalance = todaysSales - todaysExpenses;

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || !expenseDesc) return;
    addExpense(parseFloat(expenseAmount), expenseDesc);
    setExpenseAmount('');
    setExpenseDesc('');
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
      {/* Active Bills Section */}
      <div className="xl:col-span-8 space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <CreditCard size={22} className="text-indigo-600" />
          Pending Bills
        </h2>

        {completedOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
            <p className="text-slate-500 font-medium">No completed orders ready for billing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {completedOrders.map(order => (
              <div key={order.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <div className="flex justify-between mb-4">
                  <h3 className="text-lg font-bold">Table {order.tableNumber}</h3>
                  <span className="text-slate-400 text-sm font-medium">#{order.id.slice(0,5)}</span>
                </div>
                
                <div className="space-y-2 mb-6 border-y border-slate-50 py-4">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-600">x{item.quantity} {item.name}</span>
                      <span className="font-semibold text-slate-800">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm text-slate-400 pt-2">
                    <span>Service Charge (5%)</span>
                    <span>${(order.total * 0.05).toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-6">
                  <span className="text-lg font-bold text-slate-800">Total</span>
                  <span className="text-2xl font-black text-indigo-600">${(order.total * 1.05).toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button className="flex items-center justify-center gap-2 py-3 border-2 border-slate-100 rounded-xl text-slate-500 font-bold hover:bg-slate-50">
                    <Printer size={18} />
                    Print
                  </button>
                  <button 
                    onClick={() => processPayment(order.id, order.total * 1.05)}
                    className="flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
                  >
                    <CheckCircle size={18} />
                    Pay
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className="text-xl font-bold flex items-center gap-2 pt-4">
          <History size={22} className="text-slate-600" />
          Recent Transactions
        </h2>
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Time</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Description</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.slice(-5).reverse().map(t => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-800">{t.description}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      t.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-sm font-bold text-right ${t.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === 'IN' ? '+' : '-'}${t.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cash Flow Sidebar */}
      <div className="xl:col-span-4 space-y-8">
        <div className="bg-indigo-900 rounded-3xl p-8 text-white shadow-xl shadow-indigo-900/20 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-indigo-200 text-sm font-bold uppercase tracking-widest mb-2">Net Balance Today</p>
            <h3 className="text-5xl font-black mb-6">${netBalance.toFixed(2)}</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 p-3 rounded-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowUpCircle size={16} className="text-emerald-400" />
                  <span className="text-xs text-indigo-100 font-medium">Income</span>
                </div>
                <p className="text-lg font-bold">${todaysSales.toFixed(2)}</p>
              </div>
              <div className="bg-white/10 p-3 rounded-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowDownCircle size={16} className="text-rose-400" />
                  <span className="text-xs text-indigo-100 font-medium">Expenses</span>
                </div>
                <p className="text-lg font-bold">${todaysExpenses.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-indigo-500 rounded-full blur-[80px] opacity-30" />
        </div>

        {/* Expense Form */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
            <Wallet size={20} className="text-rose-600" />
            Quick Expense
          </h3>
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Amount ($)</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="number"
                  step="0.01"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 transition-all outline-none"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</label>
              <textarea 
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 transition-all outline-none resize-none"
                placeholder="e.g. Fresh Tomatoes for Kitchen"
                rows={3}
                required
              />
            </div>
            <button 
              type="submit"
              className="w-full py-4 bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all"
            >
              Log Expense
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CashierDashboard;
