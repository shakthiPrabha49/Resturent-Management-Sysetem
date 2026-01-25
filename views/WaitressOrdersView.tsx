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
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign size={22} /></div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Revenue Handled</p>
              <p className="text-2xl font-bold text-slate-800">${stats.revenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Package size={22} /></div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Orders</p>
              <p className="text-2xl font-bold text-slate-800">{stats.count}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><TrendingUp size={22} /></div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Closed Bills</p>
              <p className="text-2xl font-bold text-slate-800">{stats.completed}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/30">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Order History</h3>
            <p className="text-xs font-medium text-slate-500">Detailed log of your served tables.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
              <Calendar size={14} className="text-slate-400" />
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="bg-transparent text-[11px] font-bold outline-none text-slate-700" 
              />
              <span className="text-slate-300 mx-1 text-[11px]">to</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="bg-transparent text-[11px] font-bold outline-none text-slate-700" 
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Find table or ID..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none w-44 focus:ring-2 focus:ring-indigo-500 shadow-sm"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                <th className="px-6 py-4">Floor Details</th>
                <th className="px-6 py-4">Items</th>
                <th className="px-6 py-4 text-right">Revenue</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.length > 0 ? filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800">T-{order.table_number}</p>
                    <p className="text-[10px] text-slate-400 font-mono tracking-tighter">REF: #{order.id.slice(0, 8)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-500">{order.items.length}</span>
                      <p className="text-xs font-semibold text-slate-600">Items Processed</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-indigo-600 font-bold text-sm">${Number(order.total).toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide border ${
                      order.status === OrderStatus.PAID ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-[11px] font-bold text-slate-600">
                      {new Date(order.timestamp).toLocaleDateString()}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-300">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100"><Calendar size={32} /></div>
                      <p className="text-xs font-bold uppercase tracking-widest">No activity found</p>
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