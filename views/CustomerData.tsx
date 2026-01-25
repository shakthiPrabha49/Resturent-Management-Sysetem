
import React, { useState, useEffect, useMemo } from 'react';
import { Customer, User } from '../types.ts';
import { db } from '../db.ts';
// Added Users to the imports from lucide-react to fix "Cannot find name 'Users'" error on line 234
import { UserPlus, Search, Phone, User as UserIcon, Hash, Loader2, CheckCircle, Database, Calendar, Users } from 'lucide-react';

interface CustomerDataProps {
  currentUser: User;
}

const CustomerDataView: React.FC<CustomerDataProps> = ({ currentUser }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const data = await db.from('customers').select('ORDER BY created_at DESC');
      if (data) setCustomers(data);
    } catch (err) {
      console.error("Fetch customers error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    setIsSubmitting(true);
    const newCustomer: Customer = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      phone,
      id_number: idNumber,
      created_at: Date.now()
    };

    try {
      await db.from('customers').insert([newCustomer]);
      setName('');
      setPhone('');
      setIdNumber('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchCustomers();
    } catch (err) {
      alert("Failed to save customer data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.phone.includes(q) || 
      (c.id_number && c.id_number.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12 animate-in fade-in duration-500">
      {/* Lead Generation Form */}
      <div className="lg:col-span-5">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-28">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <UserPlus size={20} className="text-indigo-600" />
              Capture New Lead
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-1">Collect data for future marketing & loyalty.</p>
          </div>

          <form onSubmit={handleAddCustomer} className="p-6 space-y-5">
            {showSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-2 animate-in zoom-in duration-300">
                <CheckCircle size={16} /> Customer lead saved successfully!
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Customer Name *</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="e.g. John Doe"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Phone Number *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="e.g. +1 234 567 890"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">ID Number (Optional)</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                  type="text" 
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="e.g. ID-88291"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Submit Customer Data"}
            </button>
          </form>

          <div className="p-4 bg-indigo-50/50 border-t border-slate-100 flex items-center justify-center gap-2 text-[10px] font-bold text-indigo-400 uppercase tracking-tighter">
            <Database size={12} />
            Data securely synced to Cloudflare D1
          </div>
        </div>
      </div>

      {/* Database Listing */}
      <div className="lg:col-span-7 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Lead Database</h2>
            <p className="text-xs font-medium text-slate-500">Review all captured potential customers.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none w-full md:w-64 focus:ring-2 focus:ring-indigo-500 shadow-sm"
              placeholder="Search leads..."
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                  <th className="px-6 py-4">Customer Name</th>
                  <th className="px-6 py-4">Contact Detail</th>
                  <th className="px-6 py-4">Identification</th>
                  <th className="px-6 py-4 text-right">Captured</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <Loader2 className="animate-spin text-indigo-400 mx-auto" size={24} />
                    </td>
                  </tr>
                ) : filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 text-sm">{c.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
                        <Phone size={12} />
                        {c.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded border border-slate-200">
                        {c.id_number || "NOT PROVIDED"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-slate-400">
                        <Calendar size={12} />
                        <span className="text-[11px] font-bold">
                          {new Date(c.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-300">
                        <Database size={32} />
                        <p className="text-xs font-bold uppercase tracking-widest">No matching leads found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="p-6 bg-slate-900 rounded-xl text-white shadow-lg flex items-center gap-6">
          <div className="p-4 bg-indigo-600 rounded-2xl">
            <Users size={32} />
          </div>
          <div>
            <h4 className="font-bold text-lg">Marketing Total: {customers.length}</h4>
            <p className="text-xs font-medium text-slate-400 leading-relaxed">
              Every lead captured is stored in your D1 instance. Use this data for seasonal discounts and SMS alerts to increase repeat business.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDataView;
