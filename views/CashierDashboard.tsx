import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Order, OrderStatus, Transaction, Table, TableStatus } from '../types.ts';
import { CreditCard, History, Printer, CheckCircle, Wallet, ArrowUpCircle, ArrowDownCircle, DollarSign, Loader2, FileText } from 'lucide-react';
import { playSound, SOUNDS } from '../utils/audio.ts';

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
  
  const prevBillsCount = useRef(0);
  const isFirstRender = useRef(true);

  const finalizedBills = useMemo(() => {
    const completedTableIds = tables
      .filter(t => t.status === TableStatus.COMPLETED)
      .map(t => t.id);
    
    return orders.filter(o => 
      completedTableIds.includes(o.table_id) && 
      o.status !== OrderStatus.PAID
    );
  }, [orders, tables]);

  useEffect(() => {
    if (!isFirstRender.current && finalizedBills.length > prevBillsCount.current) {
      playSound(SOUNDS.CASH_REGISTER);
    }
    prevBillsCount.current = finalizedBills.length;
    isFirstRender.current = false;
  }, [finalizedBills]);

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
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 pb-12">
      <div className="xl:col-span-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <CreditCard size={22} className="text-indigo-600" />
              Billing Terminal
            </h2>
            <p className="text-sm text-slate-500 font-medium">Settle completed table orders.</p>
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-emerald-100 shadow-sm">
            {finalizedBills.length} BILLS READY
          </span>
        </div>

        {finalizedBills.length === 0 ? (
          <div className="bg-white rounded-xl py-24 text-center border border-slate-200 shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <FileText size={32} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No pending bills</h3>
            <p className="text-slate-400 font-medium mt-1">When a waitress marks a table as "Completed", it will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {finalizedBills.map(order => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col hover:shadow-md transition-all">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Table T-{order.table_number}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Ref: #{order.id.slice(0,6)}</p>
                  </div>
                  <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all">
                    <Printer size={18} />
                  </button>
                </div>
                
                <div className="p-6 flex-1 space-y-2">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center bg-slate-50 rounded text-[10px] font-bold text-slate-500 border border-slate-100">{item.quantity}</span>
                        <span className="font-semibold text-slate-700">{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-800">${(Number(item.price) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                  <div className="flex justify-between items-end mb-5">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subtotal: ${Number(order.total).toFixed(2)}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tax (5%): ${(Number(order.total) * 0.05).toFixed(2)}</p>
                    </div>
                    <p className="text-2xl font-bold text-indigo-600">${(Number(order.total) * 1.05).toFixed(2)}</p>
                  </div>

                  <button 
                    onClick={() => handlePay(order)}
                    disabled={isProcessing === order.id}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 text-white font-bold rounded-lg shadow-sm hover:bg-emerald-700 transition-all uppercase tracking-wider text-xs disabled:opacity-50"
                  >
                    {isProcessing === order.id ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle size={16} /> Finalize Payment</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="xl:col-span-4 space-y-6">
        <div className="bg-slate-900 rounded-xl p-8 text-white shadow-md">
          <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Today's Performance</p>
          <h3 className="text-4xl font-bold mb-8">${netBalance.toFixed(2)}</h3>
          
          <div className="space-y-3 pt-6 border-t border-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-400">Total Sales</span>
              <span className="text-sm font-bold text-emerald-400">+${todaysSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-400">Expenses</span>
              <span className="text-sm font-bold text-rose-400">-${todaysExpenses.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-md font-bold text-slate-800 flex items-center gap-2 mb-6">
            <Wallet size={18} className="text-indigo-600" />
            Petty Cash Out
          </h3>
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Amount ($)</label>
              <input type="number" step="0.01" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0.00" required />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Reason</label>
              <textarea value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none" placeholder="e.g. Grocery restock" required />
            </div>
            <button type="submit" className="w-full py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-all text-xs uppercase tracking-wide">Record Expense</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CashierDashboard;