
import React, { useState, useMemo } from 'react';
import { Order, User, OrderStatus } from '../types.ts';
import { Calendar, TrendingUp, DollarSign, Package, ChevronRight, Search } from 'lucide-react';

interface WaitressOrdersViewProps {
  currentUser: User;
  orders: Order[];
}

const WaitressOrdersView: React.FC<WaitressOrdersViewProps> = ({ currentUser, orders }) => {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOrders = useMemo(() => {
    const startTs = new Date(startDate).getTime();
    const endTs = new Date(endDate).getTime() + 86400000; // end of day

    return orders.filter(o => {
      const isMe = o.waitress_name === currentUser.name;
      const withinDate = o.timestamp >= startTs && o.timestamp <= endTs;
      const matchesSearch = o.table_number.toString().includes(searchTerm) || o.id.includes(searchTerm);
      return isMe && withinDate && matchesSearch;
    });
  }, [orders, currentUser.name, startDate, endDate, searchTerm]);

  const stats = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const paidCount = filteredOrders.filter(o => o.status === OrderStatus.PAID).length;
    return {
      revenue: totalRevenue,
      count: filteredOrders.length,
      completed: paidCount
    };
  }, [filteredOrders]);

  return (
    <div className="space-y-8 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-7 rounded-[32px] shadow-sm border border-slate-100">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><DollarSign size={24} /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue Handled</p>
              <p className="text-2xl font-black text-slate-800">${stats.revenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-7 rounded-[32px] shadow-sm border border-slate-100">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><Package size={24} /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Orders</p>
              <p className="text-2xl font-black text-slate-800">{stats.count}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-7 rounded-[32px] shadow-sm border border-slate-100">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl"><TrendingUp size={24} /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Closed Bills</p>
              <p className="text-2xl font-black text-slate-800">{stats.completed}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <h3 className="text-xl font-black tracking-tighter">Order History</h3>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border">
              <Calendar size={14} className="text-slate-400" />
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="bg-transparent text-xs font-bold outline-none" 
              />
              <span className="text-slate-300 mx-1">to</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="bg-transparent text-xs font-bold outline-none" 
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Table # or Order ID" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border rounded-xl text-xs font-bold outline-none w-48 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <th className="px-8 py-4">Order Details</th>
                <th className="px-8 py-4">Items</th>
                <th className="px-8 py-4">Total</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.length > 0 ? filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <p className="font-black text-slate-800">Table T-{order.table_number}</p>
                    <p className="text-[10px] text-slate-400 font-mono">#{order.id.slice(0, 8)}</p>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-bold text-slate-600">{order.items.length} items</p>
                  </td>
                  <td className="px-8 py-5 text-indigo-600 font-black">
                    ${Number(order.total).toFixed(2)}
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${
                      order.status === OrderStatus.PAID ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs font-bold text-slate-500">
                      {new Date(order.timestamp).toLocaleDateString()}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-30">
                      <Calendar size={48} />
                      <p className="font-bold">No orders found for this period.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WaitressOrdersView;
