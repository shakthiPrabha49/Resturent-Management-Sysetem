
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Order, OrderStatus, Transaction, Table, TableStatus } from '../types.ts';
import { CreditCard, History, Printer, CheckCircle, Wallet, ArrowUpCircle, ArrowDownCircle, DollarSign, Loader2 } from 'lucide-react';
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

  // Monitor for new finalized bills to play the register sound
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
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
      <div className="xl:col-span-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CreditCard size={22} className="text-indigo-600" />
            Final Bills (Ready to Pay)
          </h2>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
            {finalizedBills.length} READY
          </span>
        </div>

        {finalizedBills.length === 0 ? (
          <div className="bg-white rounded-[40px] p-20 text-center border-2 border-dashed border-slate-100">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <DollarSign size={32} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-bold text-lg">No bills found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {finalizedBills.map(order => (
              <div key={order.id} className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col hover:shadow-2xl hover:shadow-indigo-500/5 transition-all">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Table T-{order.table_number}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Order #{order.id.slice(0,5)}</p>
                  </div>
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl cursor-pointer hover:bg-indigo-100 transition-colors">
                    <Printer size={20} />
                  </div>
                </div>
                
                <div className="space-y-3 mb-8 border-y border-slate-50 py-6">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded text-[10px] font-black text-slate-500">{item.quantity}</span>
                        <span className="font-bold text-slate-700">{item.name}</span>
                      </div>
                      <span className="font-black text-slate-900">${(Number(item.price) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto">
                  <div className="flex justify-between items-end mb-8">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total with Tax (5%)</span>
                    <span className="text-3xl font-black text-indigo-600">${(Number(order.total) * 1.05).toFixed(2)}</span>
                  </div>

                  <button 
                    onClick={() => handlePay(order)}
                    disabled={isProcessing === order.id}
                    className="w-full flex items-center justify-center gap-3 py-5 bg-emerald-600 text-white font-black rounded-2xl shadow-xl hover:bg-emerald-700 transition-all uppercase tracking-widest text-xs disabled:opacity-50"
                  >
                    {isProcessing === order.id ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle size={18} /> Confirm Payment</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="xl:col-span-4 space-y-8">
        <div className="bg-slate-900 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Today's Net</p>
          <h3 className="text-5xl font-black mb-10">${netBalance.toFixed(2)}</h3>
          <div className="space-y-4">
            <div className="flex justify-between text-emerald-400 font-bold"><span>Sales</span><span>${todaysSales.toFixed(2)}</span></div>
            <div className="flex justify-between text-rose-400 font-bold"><span>Expenses</span><span>${todaysExpenses.toFixed(2)}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
          <h3 className="text-lg font-black flex items-center gap-3 mb-8 text-slate-800">Log Expense</h3>
          <form onSubmit={handleExpenseSubmit} className="space-y-6">
            <input type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl" placeholder="Amount" required />
            <textarea value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl" placeholder="Description" required />
            <button type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl">Add Transaction</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CashierDashboard;
