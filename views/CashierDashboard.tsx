
import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, Transaction, Table, TableStatus } from '../types.ts';
import { CreditCard, History, Printer, CheckCircle, Wallet, ArrowUpCircle, ArrowDownCircle, DollarSign, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient.ts';

interface CashierDashboardProps {
  orders: Order[];
  processPayment: (orderId: string, amount: number) => void;
  transactions: Transaction[];
  addExpense: (amount: number, description: string) => void;
  tables: Table[];
}

const CashierDashboard: React.FC<CashierDashboardProps> = ({ 
  orders, processPayment, transactions, addExpense, tables 
}) => {
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const finalizedBills = useMemo(() => {
    const completedTableIds = tables
      .filter(t => t.status === TableStatus.COMPLETED)
      .map(t => t.id);
    
    return orders.filter(o => 
      completedTableIds.includes(o.tableId) && 
      o.status !== OrderStatus.PAID
    );
  }, [orders, tables]);

  const todaysSales = transactions.filter(t => t.type === 'IN').reduce((acc, t) => acc + Number(t.amount), 0);
  const todaysExpenses = transactions.filter(t => t.type === 'OUT').reduce((acc, t) => acc + Number(t.amount), 0);
  const netBalance = todaysSales - todaysExpenses;

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || !expenseDesc) return;
    addExpense(parseFloat(expenseAmount), expenseDesc);
    setExpenseAmount('');
    setExpenseDesc('');
  };

  const handlePay = async (order: Order) => {
    setIsProcessing(order.id);
    await processPayment(order.id, order.total * 1.05);
    setIsProcessing(null);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
      <div className="xl:col-span-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CreditCard size={22} className="text-indigo-600" />
            Final Bills (Ready to Pay)
          </h2>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
            {finalizedBills.length} TABLES READY
          </span>
        </div>

        {finalizedBills.length === 0 ? (
          <div className="bg-white rounded-[40px] p-20 text-center border-2 border-dashed border-slate-100">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <DollarSign size={32} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-bold text-lg">No finalized bills found.</p>
            <p className="text-slate-400 text-sm mt-1">Wait for a waitress to click "Finish Table".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {finalizedBills.map(order => (
              <div key={order.id} className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col hover:shadow-2xl hover:shadow-indigo-500/5 transition-all">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Table T-{order.tableNumber}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Order #{order.id.slice(0,5)}</p>
                  </div>
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl cursor-pointer hover:bg-indigo-100 transition-colors">
                    <Printer size={20} />
                  </div>
                </div>
                
                <div className="space-y-3 mb-8 border-y border-slate-50 py-6 max-h-48 overflow-y-auto custom-scrollbar">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded text-[10px] font-black text-slate-500">{item.quantity}</span>
                        <span className="font-bold text-slate-700">{item.name}</span>
                      </div>
                      <span className="font-black text-slate-900">${(Number(item.price) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-[11px] text-slate-400 font-bold uppercase tracking-widest pt-4">
                    <span>Tax & Service (5%)</span>
                    <span>${(Number(order.total) * 0.05).toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-auto">
                  <div className="flex justify-between items-end mb-8">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Grand Total</span>
                    <span className="text-4xl font-black text-indigo-600 leading-none">${(Number(order.total) * 1.05).toFixed(2)}</span>
                  </div>

                  <button 
                    onClick={() => handlePay(order)}
                    disabled={isProcessing === order.id}
                    className="w-full flex items-center justify-center gap-3 py-5 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/30 hover:bg-emerald-700 transition-all uppercase tracking-widest text-xs disabled:opacity-50"
                  >
                    {isProcessing === order.id ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle size={18} /> Confirm Payment</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-8">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-slate-700">
            <History size={22} className="text-slate-400" />
            Recent Activity
          </h2>
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transactions.slice(0, 10).map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-4 text-xs font-bold text-slate-400">
                      {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-8 py-4">
                      <p className="text-sm font-bold text-slate-800">{t.description}</p>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${t.type === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {t.type === 'IN' ? 'Sale' : 'Expense'}
                      </span>
                    </td>
                    <td className={`px-8 py-4 text-sm font-black text-right ${t.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'IN' ? '+' : '-'}${Number(t.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="xl:col-span-4 space-y-8">
        <div className="bg-slate-900 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Net Cash (Today)</p>
            <h3 className="text-5xl font-black mb-10 tracking-tighter">${netBalance.toFixed(2)}</h3>
            
            <div className="space-y-4">
              <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <ArrowUpCircle size={14} className="text-emerald-400" />
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Total Sales</span>
                  </div>
                  <p className="text-lg font-black text-emerald-400">${todaysSales.toFixed(2)}</p>
                </div>
              </div>
              <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <ArrowDownCircle size={14} className="text-rose-400" />
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Total Outflow</span>
                  </div>
                  <p className="text-lg font-black text-rose-400">${todaysExpenses.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20" />
        </div>

        <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
          <h3 className="text-lg font-black flex items-center gap-3 mb-8 text-slate-800">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Wallet size={18} />
            </div>
            Log Expense
          </h3>
          <form onSubmit={handleExpenseSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Amount ($)</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input 
                  type="number"
                  step="0.01"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full pl-10 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-rose-500/10 transition-all outline-none font-bold text-slate-700"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Description</label>
              <textarea 
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-rose-500/10 transition-all outline-none resize-none font-bold text-slate-700 text-sm"
                placeholder="e.g. Fresh vegetable supply"
                rows={3}
                required
              />
            </div>
            <button 
              type="submit"
              className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl shadow-slate-900/10 hover:bg-black transition-all uppercase tracking-[0.2em] text-xs"
            >
              Add Transaction
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CashierDashboard;
