
import React, { useState, useRef, useEffect } from 'react';
import { AppSettings, UserRole } from '../types.ts';
import { Settings as SettingsIcon, Save, Image as ImageIcon, Store, Star, Loader2, Upload, Users, UserPlus, Trash2, Edit3, Check, X } from 'lucide-react';
import { supabase } from '../supabaseClient.ts';

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
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    const { data } = await supabase.from('staff').select('*').order('name');
    if (data) setStaff(data);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        alert("Logo too large (1MB max)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setLogoUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    const updated = { ...settings, name, slogan, logo_url: logoUrl };
    onSave(updated);
    await supabase.from('app_settings').upsert(updated);
    setIsSaving(false);
    alert('Branding updated.');
  };

  const addStaff = async () => {
    if (!newStaffName || !newStaffUsername) return;
    const { error } = await supabase.from('staff').insert({
      name: newStaffName,
      username: newStaffUsername.toLowerCase(),
      role: UserRole.WAITRESS
    });
    if (!error) {
      setNewStaffName('');
      setNewStaffUsername('');
      fetchStaff();
    } else {
      alert(error.message);
    }
  };

  const deleteStaff = async (id: string) => {
    if (confirm('Are you sure you want to remove this staff member?')) {
      await supabase.from('staff').delete().eq('id', id);
      fetchStaff();
    }
  };

  const startRename = (member: any) => {
    setEditingStaffId(member.id);
    setEditName(member.name);
  };

  const saveRename = async () => {
    if (!editingStaffId || !editName) return;
    await supabase.from('staff').update({ name: editName }).eq('id', editingStaffId);
    setEditingStaffId(null);
    fetchStaff();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Owner Settings</h2>
          <p className="text-slate-500 font-medium">Branding and Staff Management</p>
        </div>
        <button
          onClick={saveSettings}
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          Save Identity
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Branding Section */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
            <h3 className="text-lg font-black mb-8 flex items-center gap-3">
              <Store size={20} className="text-indigo-600" />
              Restaurant Profile
            </h3>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none font-bold" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Slogan</label>
                <input type="text" value={slogan} onChange={(e) => setSlogan(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none font-bold" />
              </div>
              <div className="flex items-center gap-6 pt-4">
                <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300">
                  {logoUrl ? <img src={logoUrl} className="w-full h-full object-contain" /> : <ImageIcon className="text-slate-400" />}
                </div>
                <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2.5 border-2 border-slate-200 rounded-xl text-xs font-black uppercase hover:border-indigo-600 transition-all">Update Logo</button>
                <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
              </div>
            </div>
          </div>
        </div>

        {/* Staff Management Section */}
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
          <h3 className="text-lg font-black mb-8 flex items-center gap-3">
            <Users size={20} className="text-indigo-600" />
            Staff & Waitress Management
          </h3>
          
          <div className="space-y-6 mb-10">
            <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 space-y-4">
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                <UserPlus size={14} /> Add New Waitress
              </p>
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="text" placeholder="Full Name" value={newStaffName} 
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
                />
                <input 
                  type="text" placeholder="Username" value={newStaffUsername}
                  onChange={(e) => setNewStaffUsername(e.target.value)}
                  className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              <button onClick={addStaff} className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all">
                Onboard Waitress
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Current Staff Directory</p>
              {staff.map(member => (
                <div key={member.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-100 group transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-indigo-600 text-xs">
                      {member.name.charAt(0)}
                    </div>
                    {editingStaffId === member.id ? (
                      <div className="flex items-center gap-2">
                        <input 
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-2 py-1 border border-indigo-200 rounded font-bold text-sm outline-none"
                        />
                        <button onClick={saveRename} className="text-emerald-500"><Check size={18} /></button>
                        <button onClick={() => setEditingStaffId(null)} className="text-slate-400"><X size={18} /></button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-black text-slate-800">{member.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{member.username} • {member.role}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startRename(member)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit3 size={16} /></button>
                    {member.role !== 'OWNER' && (
                      <button onClick={() => deleteStaff(member.id)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={16} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
