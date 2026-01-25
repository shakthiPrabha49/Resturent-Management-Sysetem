
import React, { useState, useEffect } from 'react';
import { User, UserRole, AppSettings } from '../types.ts';
import { UtensilsCrossed, Lock, User as UserIcon, Loader2, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { db } from '../db.ts';
import { INITIAL_USERS, INITIAL_TABLES, INITIAL_MENU } from '../constants.tsx';

interface LoginProps {
  onLogin: (user: User) => void;
  appSettings: AppSettings;
}

const Login: React.FC<LoginProps> = ({ onLogin, appSettings }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [setupStatus, setSetupStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Note: In this dev version, we check if user exists and password length is >= 4
      const staff = await db.from('staff').maybeSingle("username = ?", [username.toLowerCase()]);

      if (staff) {
        if (password.length >= 4) {
          onLogin({
            id: staff.id,
            username: staff.username,
            name: staff.name,
            role: staff.role as UserRole
          });
        } else {
          setError('Password must be at least 4 characters.');
        }
      } else {
        setError('Username not found. Try "owner" or click "System Setup" below.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection failed. Ensure Cloudflare D1 is bound to your project.');
    } finally {
      setLoading(false);
    }
  };

  const initializeDatabase = async () => {
    setInitializing(true);
    setSetupStatus('idle');
    try {
      // 1. Seed Staff
      await db.from('staff').insert(INITIAL_USERS);
      
      // 2. Seed Settings
      await db.from('app_settings').insert([{
        id: 'singleton_settings',
        name: 'GustoFlow',
        slogan: 'Cloud-Synced Restaurant Operations',
        logo_url: ''
      }]);

      // 3. Seed Tables
      await db.from('tables').insert(INITIAL_TABLES);

      // 4. Seed Menu
      await db.from('menu_items').insert(INITIAL_MENU);

      setSetupStatus('success');
      setTimeout(() => setShowSetup(false), 3000);
    } catch (err) {
      console.error("Initialization Error:", err);
      setSetupStatus('error');
    } finally {
      setInitializing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-600 rounded-[2rem] mb-6 shadow-2xl shadow-indigo-600/30">
            {appSettings.logo_url ? (
               <img src={appSettings.logo_url} alt="Logo" className="w-12 h-12 object-contain" />
            ) : (
              <UtensilsCrossed size={48} className="text-white" />
            )}
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">{appSettings.name}</h1>
          <p className="text-slate-400 font-medium tracking-wide">{appSettings.slogan}</p>
        </div>

        <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-white/10">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Identity</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:border-indigo-500 focus:bg-white transition-all outline-none font-bold text-slate-700 placeholder:text-slate-300 placeholder:font-medium"
                  placeholder="e.g. owner"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Access Code</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:border-indigo-500 focus:bg-white transition-all outline-none font-bold text-slate-700 placeholder:text-slate-300 placeholder:font-medium"
                  placeholder="••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 animate-in fade-in slide-in-from-top-1">
                <AlertCircle size={16} />
                <p className="text-xs font-bold">{error}</p>
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-5 bg-indigo-600 text-white font-black rounded-[1.5rem] shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-70 disabled:pointer-events-none uppercase tracking-widest text-sm"
            >
              {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : 'Enter Workspace'}
            </button>
          </form>
          
          <div className="mt-8 pt-8 border-t border-slate-50 flex flex-col items-center">
            <button 
              onClick={() => setShowSetup(!showSetup)}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-500 transition-colors"
            >
              System Setup & Debug
            </button>

            {showSetup && (
              <div className="mt-6 w-full p-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 animate-in zoom-in-95">
                <p className="text-[10px] font-bold text-slate-500 mb-4 text-center leading-relaxed">
                  First time? Initialize your Cloudflare D1 database with default staff and menu data.
                </p>
                <button 
                  onClick={initializeDatabase}
                  disabled={initializing}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                    setupStatus === 'success' ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-black'
                  }`}
                >
                  {initializing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : setupStatus === 'success' ? (
                    <><CheckCircle size={14} /> Ready to Log In</>
                  ) : (
                    <><Database size={14} /> Initialize Database</>
                  )}
                </button>
                {setupStatus === 'error' && (
                  <p className="text-[9px] text-rose-500 mt-2 font-bold text-center">Failed. Check D1 bindings or console.</p>
                )}
                <div className="mt-4 grid grid-cols-2 gap-2">
                   <div className="p-2 bg-white rounded-lg border border-slate-100 text-[8px] font-bold text-slate-400">
                      USER: <span className="text-slate-700">owner</span>
                   </div>
                   <div className="p-2 bg-white rounded-lg border border-slate-100 text-[8px] font-bold text-slate-400">
                      PASS: <span className="text-slate-700">1234</span>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
