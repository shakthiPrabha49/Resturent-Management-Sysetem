import React, { useState } from 'react';
import { Customer, User } from '../types.ts';
import { db } from '../db.ts';
import { UserPlus, Phone, User as UserIcon, Hash, Loader2, CheckCircle, Database } from 'lucide-react';

interface CustomerDataProps {
  currentUser: User;
}

const CustomerDataView: React.FC<CustomerDataProps> = ({ currentUser }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successType, setSuccessType] = useState<'saved' | 'updated' | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    setIsSubmitting(true);
    
    try {
      // Check if customer exists by phone (Primary Key)
      const existing = await db.from('customers').maybeSingle("phone = ?", [phone]);

      if (existing) {
        // UPDATE Existing
        await db.from('customers').update({
          name,
          id_number: idNumber,
          last_visit: Date.now()
        }).eq('phone', phone);
        setSuccessType('updated');
      } else {
        // INSERT New
        const newCustomer: Customer = {
          phone,
          name,
          id_number: idNumber,
          created_at: Date.now(),
          last_visit: Date.now()
        };
        await db.from('customers').insert([newCustomer]);
        setSuccessType('saved');
      }

      setName('');
      setPhone('');
      setIdNumber('');
      setTimeout(() => setSuccessType(null), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to process customer data. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 animate-in fade-in duration-500">
      <div className="w-full max-w-xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Customer Registration</h2>
          <p className="text-slate-500 font-medium mt-2 italic">Register customer for loyalty rewards and marketing updates.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <UserPlus size={22} className="text-indigo-600" />
              Lead Information
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Fields marked with (*) are required</p>
          </div>

          <form onSubmit={handleAddCustomer} className="p-10 space-y-8">
            {successType && (
              <div className={`p-4 border rounded-xl text-sm font-bold flex items-center gap-3 animate-in zoom-in duration-300 ${
                successType === 'saved' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-indigo-50 border-indigo-100 text-indigo-700'
              }`}>
                <CheckCircle size={20} /> 
                {successType === 'saved' ? 'New customer successfully registered!' : 'Customer records updated.'}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Phone Number * (Primary ID)</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                    placeholder="Enter phone number..."
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Full Name *</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                    placeholder="Customer full name..."
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">ID Number (Optional)</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="text" 
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                    placeholder="Government ID or Loyalty Ref"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-5 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest disabled:opacity-50 active:scale-95"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "Finalize Lead Entry"}
            </button>
          </form>

          <div className="p-6 bg-indigo-50/50 border-t border-slate-100 flex items-center justify-center gap-2 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
            <Database size={14} />
            Encrypted Sync to D1 Marketing Cloud
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDataView;