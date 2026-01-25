
import React, { useState, useRef, useEffect } from 'react';
import { AppSettings, UserRole } from '../types.ts';
import { Save, Store, UserPlus, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { db } from '../db.ts';

interface SettingsProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

// Fix: Completed the component implementation and added default export to resolve "no default export" error.
const SettingsView: React.FC<SettingsProps> = ({ settings, onSave }) => {
  const [name, setName] = useState(settings.name);
  const [slogan, setSlogan] = useState(settings.slogan);
  const [logoUrl, setLogoUrl] = useState(settings.logo_url);
  const [isSaving, setIsSaving] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffUsername, setNewStaffUsername] = useState('');

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    const data = await db.from('staff').select('ORDER BY name');
    if (data) setStaff(data);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = { ...settings, name, slogan, logo_url: logoUrl };
      await db.from('app_settings').update(updated).eq('id', 'singleton_settings');
      onSave(updated);
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName || !newStaffUsername) return;
    await db.from('staff').insert([{
      id: Math.random().toString(36).substr(2, 9),
      name: newStaffName,
      username: newStaffUsername.toLowerCase(),
      role: UserRole.WAITRESS
    }]);
    setNewStaffName('');
    setNewStaffUsername('');
    fetchStaff();
  };

  const removeStaff = async (id: string) => {
    await db.from('staff').delete().eq('id', id);
    fetchStaff();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="bg-white rounded-[40px] p-10 shadow-sm border border-slate-100">
        <div className="flex items-center gap-4 mb-10">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white">
            <Store size={24} />
          </div>
          <h2 className="text-2xl font-black text-slate-800">Restaurant Identity</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Business Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Slogan / Tagline</label>
            <input 
              type="text" 
              value={slogan} 
              onChange={(e) => setSlogan(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Logo URL</label>
            <div className="flex gap-4">
              <input 
                type="text" 
                value={logoUrl} 
                onChange={(e) => setLogoUrl(e.target.value)}
                className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                placeholder="https://..."
              />
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-200 overflow-hidden">
                {logoUrl ? <img src={logoUrl} alt="Preview" className="w-full h-full object-contain" /> : <ImageIcon size={20} />}
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full md:w-auto px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
        >
          {isSaving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Save Configuration</>}
        </button>
      </div>

      <div className="bg-white rounded-[40px] p-10 shadow-sm border border-slate-100">
        <div className="flex items-center gap-4 mb-10">
          <div className="p-3 bg-slate-900 rounded-2xl text-white">
            <UserPlus size={24} />
          </div>
          <h2 className="text-2xl font-black text-slate-800">Staff Accounts</h2>
        </div>

        <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 p-6 bg-slate-50 rounded-[32px] border border-slate-100">
          <input 
            type="text" 
            placeholder="Full Name" 
            value={newStaffName}
            onChange={(e) => setNewStaffName(e.target.value)}
            className="p-4 bg-white border border-slate-200 rounded-2xl font-bold"
            required
          />
          <input 
            type="text" 
            placeholder="Username" 
            value={newStaffUsername}
            onChange={(e) => setNewStaffUsername(e.target.value)}
            className="p-4 bg-white border border-slate-200 rounded-2xl font-bold"
            required
          />
          <button type="submit" className="bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all">
            Add Waitress
          </button>
        </form>

        <div className="space-y-3">
          {staff.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-[28px] hover:border-indigo-100 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-lg">
                  {s.name.charAt(0)}
                </div>
                <div>
                  <p className="font-black text-slate-800">{s.name}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.role} • @{s.username}</p>
                </div>
              </div>
              {s.role !== UserRole.OWNER && (
                <button 
                  onClick={() => removeStaff(s.id)}
                  className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
