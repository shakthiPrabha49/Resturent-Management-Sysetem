
import React, { useState, useRef } from 'react';
import { AppSettings } from '../types.ts';
import { Settings as SettingsIcon, Save, Image as ImageIcon, Store, Star, Loader2, Upload } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (e.g., 2MB limit for base64 strings to prevent DB issues)
      if (file.size > 2 * 1024 * 1024) {
        alert("Logo file is too large. Please use an image under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    // Use a fixed ID if none exists to ensure we only ever have one settings row
    const targetId = settings.id === 'default' ? 'singleton_settings' : settings.id;
    
    // Using upsert instead of update to handle initial creation of the settings row
    const { error } = await supabase
      .from('app_settings')
      .upsert({ 
        id: targetId,
        name, 
        slogan, 
        logo_url: logoUrl 
      });

    if (!error) {
      onSave({ id: targetId, name, slogan, logo_url: logoUrl });
      alert('Settings updated successfully!');
    } else {
      console.error('Settings save error:', error);
      alert(`Failed to save settings: ${error.message}`);
    }
    setIsSaving(false);
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
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

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
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
                  placeholder="GustoFlow"
                />
              </div>
              
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Slogan / Tagline</label>
                <input 
                  type="text"
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
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
                <p className="text-slate-500 text-sm">Upload a high-quality image of your logo. Square formats work best for the dashboard layout.</p>
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
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preview</span>
              </div>
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-white/10 rounded-2xl border border-white/5">
                   {logoUrl ? (
                     <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain invert" />
                   ) : (
                     <Store size={24} />
                   )}
                </div>
                <div>
                  <h4 className="text-xl font-black">{name || 'GustoFlow'}</h4>
                  <p className="text-xs text-slate-400">{slogan || 'Cloud Operations'}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                This is how your restaurant branding will appear across the application for all staff members.
              </p>
            </div>
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-indigo-500/20 rounded-full blur-[40px]" />
          </div>

          <div className="bg-emerald-50 rounded-[32px] p-8 border border-emerald-100">
             <h4 className="font-bold text-emerald-800 mb-2">Sync Status</h4>
             <p className="text-sm text-emerald-600 mb-4 font-medium">Your settings are automatically synced to the cloud and reflect on all connected devices in real-time.</p>
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
               <span className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">Live Connection Established</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
