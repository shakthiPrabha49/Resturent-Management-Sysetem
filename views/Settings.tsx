
import React, { useState, useRef } from 'react';
import { AppSettings } from '../types.ts';
import { Settings as SettingsIcon, Save, Image as ImageIcon, Store, Star, Loader2, Upload, AlertCircle, Terminal, Copy, Check } from 'lucide-react';
import { supabase } from '../supabaseClient.ts';

const SETTINGS_KEY = 'gustoflow_local_settings';

const SETUP_SQL = `-- Run this in your Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'GustoFlow',
  slogan TEXT,
  logo_url TEXT
);

ALTER PUBLICATION supabase_realtime ADD TABLE app_settings;

INSERT INTO public.app_settings (id, name, slogan) 
VALUES ('singleton_settings', 'GustoFlow', 'Cloud-Synced Restaurant Operations') 
ON CONFLICT DO NOTHING;`;

interface SettingsProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

const SettingsView: React.FC<SettingsProps> = ({ settings, onSave }) => {
  const [name, setName] = useState(settings.name);
  const [slogan, setSlogan] = useState(settings.slogan);
  const [logoUrl, setLogoUrl] = useState(settings.logo_url);
  const [isSaving, setIsSaving] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        alert("Image is too large for cloud storage (1MB max). Please use a smaller image.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const copySql = () => {
    navigator.clipboard.writeText(SETUP_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setDbError(null);
    
    const targetId = settings.id || 'singleton_settings';
    const updatedSettings = { id: targetId, name, slogan, logo_url: logoUrl };

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
    onSave(updatedSettings);

    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert(updatedSettings);

      if (!error) {
        alert('Settings synced to Cloud successfully!');
      } else {
        console.error('Database Error:', error);
        if (error.message.includes("Could not find the table")) {
          setDbError("Table 'app_settings' missing in Supabase.");
        } else {
          setDbError(error.message);
        }
      }
    } catch (e) {
      setDbError("Network error. Settings saved locally.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Settings</h2>
          <p className="text-slate-500 font-medium">Manage your restaurant identity and branding</p>
        </div>
        <button
          onClick={saveSettings}
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          {isSaving ? 'Saving...' : 'Save Branding'}
        </button>
      </div>

      {dbError && (
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[32px] shadow-2xl overflow-hidden relative group">
          <div className="flex items-start gap-4 relative z-10">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
              <Terminal size={24} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">Cloud Setup Required</h3>
                  <p className="text-slate-400 text-sm mt-1">Run the script below in your Supabase SQL Editor to enable branding sync.</p>
                </div>
                <button 
                  onClick={copySql}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy SQL'}
                </button>
              </div>
              
              <div className="mt-6 bg-black/40 p-5 rounded-2xl font-mono text-[11px] text-indigo-300 border border-white/5 overflow-x-auto whitespace-pre">
                {SETUP_SQL}
              </div>
            </div>
          </div>
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Store size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Business Details</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Restaurant Name</label>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 transition-all"
                  placeholder="GustoFlow"
                />
              </div>
              
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Slogan / Tagline</label>
                <input 
                  type="text"
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 transition-all"
                  placeholder="Premium Restaurant Experience"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <ImageIcon size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Visual Branding</h3>
            </div>
            
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="w-32 h-32 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 flex items-center justify-center relative group overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-contain p-4" />
                ) : (
                  <ImageIcon size={32} className="text-slate-300" />
                )}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Upload size={24} className="text-white" />
                </button>
              </div>
              
              <div className="flex-1 space-y-4 text-center md:text-left">
                <h4 className="font-bold text-slate-800 text-lg">Restaurant Logo</h4>
                <p className="text-slate-500 text-sm">Square formats work best. Max 1MB.</p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2 border-2 border-slate-200 rounded-xl font-bold text-xs uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition-all"
                >
                  Choose File
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleLogoUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <Star className="text-amber-400 fill-amber-400" size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Preview</span>
              </div>
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-white/10 rounded-2xl border border-white/5 shrink-0">
                   {logoUrl ? (
                     <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
                   ) : (
                     <Store size={24} />
                   )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xl font-black truncate">{name || 'GustoFlow'}</h4>
                  <p className="text-xs text-slate-400 truncate">{slogan || 'Cloud Operations'}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                {dbError ? 'Branding is currently stored only in this browser cache.' : 'Branding is synced with cloud and all staff devices.'}
              </p>
            </div>
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-indigo-500/20 rounded-full blur-[40px]" />
          </div>

          <div className="bg-emerald-50 rounded-[32px] p-8 border border-emerald-100">
             <h4 className="font-bold text-emerald-800 mb-2 text-sm uppercase">Cloud-Local Engine</h4>
             <p className="text-xs text-emerald-600 mb-4 font-medium">Settings are persisted locally to ensure zero-downtime branding even during sync issues.</p>
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
               <span className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">Active Connection Mode</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
