import React, { useState, useEffect } from 'react';
import { AppSettings, UserRole } from '../types.ts';
import { Save, Store, UserPlus, Trash2, Loader2, Image as ImageIcon, UserCircle } from 'lucide-react';
import { db } from '../db.ts';

interface SettingsProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

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
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <Store size={20} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Business Identity</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trading Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Marketing Tagline</label>
            <input 
              type="text" 
              value={slogan} 
              onChange={(e) => setSlogan(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-sm"
            />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Public Logo Asset (URL)</label>
            <div className="flex gap-4">
              <input 
                type="text" 
                value={logoUrl} 
                onChange={(e) => setLogoUrl(e.target.value)}
                className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-sm"
                placeholder="https://example.com/logo.png"
              />
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-300 border border-slate-200 overflow-hidden shrink-0">
                {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <ImageIcon size={20} />}
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wide"
        >
          {isSaving ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Save Branding</>}
        </button>
      </div>

      <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-slate-900 rounded-lg text-white">
            <UserCircle size={20} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Staff Management</h2>
        </div>

        <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8 p-5 bg-slate-50 rounded-xl border border-slate-200">
          <input 
            type="text" 
            placeholder="Display Name" 
            value={newStaffName}
            onChange={(e) => setNewStaffName(e.target.value)}
            className="p-3 bg-white border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          <input 
            type="text" 
            placeholder="Username" 
            value={newStaffUsername}
            onChange={(e) => setNewStaffUsername(e.target.value)}
            className="p-3 bg-white border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          <button type="submit" className="bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-all text-xs uppercase tracking-wide">
            Add Waitress
          </button>
        </form>

        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Current Personnel</p>
          {staff.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-lg hover:border-indigo-200 hover:shadow-sm transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm border border-slate-200">
                  {s.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">{s.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{s.role} • @{s.username}</p>
                </div>
              </div>
              {s.role !== UserRole.OWNER && (
                <button 
                  onClick={() => removeStaff(s.id)}
                  className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                >
                  <Trash2 size={16} />
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