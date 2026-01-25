
import React, { useState } from 'react';
import { User, UserRole, AppSettings } from '../types.ts';
import { UtensilsCrossed, Lock, User as UserIcon, Loader2, Database, CheckCircle, AlertCircle, Info, RefreshCcw } from 'lucide-react';
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
  const [setupLogs, setSetupLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setSetupLogs(prev => [...prev.slice(-4), msg]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
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
        setError('User not found. Ensure the database is initialized.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const checkConnection = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await db.checkConnection();
      alert("Success: " + res.message);
    } catch (err: any) {
      setError("Connection Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const initializeDatabase = async () => {
    setInitializing(true);
    setSetupStatus('idle');
    setSetupLogs([]);
    try {
      addLog("Checking environment...");
      await db.checkConnection();

      addLog("Creating tables...");
      await db.execute(`CREATE TABLE IF NOT EXISTS staff (id TEXT PRIMARY KEY, name TEXT, username TEXT, role TEXT)`);
      await db.execute(`CREATE TABLE IF NOT EXISTS app_settings (id TEXT PRIMARY KEY, name TEXT, slogan TEXT, logo_url TEXT)`);
      await db.execute(`CREATE TABLE IF NOT EXISTS tables (id TEXT PRIMARY KEY, number INTEGER, status TEXT, waitress_name TEXT)`);
      await db.execute(`CREATE TABLE IF NOT EXISTS menu_items (id TEXT PRIMARY KEY, item_number TEXT, name TEXT, category TEXT, price REAL, is_available INTEGER, description TEXT)`);
      await db.execute(`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, table_id TEXT, table_number INTEGER, items TEXT, status TEXT, timestamp INTEGER, total REAL, waitress_name TEXT)`);
      await db.execute(`CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, type TEXT, amount REAL, description TEXT, timestamp INTEGER, category TEXT)`);
      await db.execute(`CREATE TABLE IF NOT EXISTS stock_entries (id TEXT PRIMARY KEY, item_name TEXT, quantity REAL, purchase_date INTEGER)`);

      addLog("Checking if seed needed...");
      const existing = await db.from('staff').maybeSingle("username = 'owner'");
      
      if (!existing) {
        addLog("Seeding staff accounts...");
        await db.from('staff').insert(INITIAL_USERS);
        
        addLog("Seeding settings...");
        await db.from('app_settings').insert([{
          id: 'singleton_settings',
          name: 'GustoFlow',
          slogan: 'Cloud-Synced Restaurant Operations',
          logo_url: ''
        }]);

        addLog("Seeding tables and menu...");
        await db.from('tables').insert(INITIAL_TABLES);
        await db.from('menu_items').insert(INITIAL_MENU);
      } else {
        addLog("Database already has data.");
      }

      addLog("Initialization complete!");
      setSetupStatus('success');
    } catch (err: any) {
      console.error("Initialization Error:", err);
      setSetupStatus('error');
      setError("Setup Failed: " + err.message);
    } finally {
      setInitializing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
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
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:border-indigo-500 focus:bg-white transition-all outline-none font-bold text-slate-700 placeholder:text-slate-300"
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
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:border-indigo-500 focus:bg-white transition-all outline-none font-bold text-slate-700 placeholder:text-slate-300"
                  placeholder="••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 animate-in fade-in slide-in-from-top-1 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} />
                  <p className="text-xs font-bold">Error</p>
                </div>
                <p className="text-[10px] font-medium leading-relaxed">{error}</p>
                {error.includes('binding') && (
                   <p className="text-[9px] bg-rose-600 text-white p-2 rounded-lg font-bold">
                     Go to Pages > Settings > Functions > D1 Database Bindings. Add 'DB' as the variable name.
                   </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button 
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center py-5 bg-indigo-600 text-white font-black rounded-[1.5rem] shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-70 uppercase tracking-widest text-sm"
              >
                {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : 'Login'}
              </button>
              <button 
                type="button"
                onClick={checkConnection}
                className="p-5 bg-slate-100 text-slate-500 rounded-[1.5rem] hover:bg-slate-200 transition-all"
                title="Test Connection"
              >
                <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </form>
          
          <div className="mt-8 pt-8 border-t border-slate-50 flex flex-col items-center">
            <button 
              onClick={() => setShowSetup(!showSetup)}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-2"
            >
              <Database size={12} />
              First Time Setup
            </button>

            {showSetup && (
              <div className="mt-6 w-full p-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 animate-in zoom-in-95">
                <div className="flex items-start gap-3 mb-4">
                  <Info size={16} className="text-indigo-500 mt-1 shrink-0" />
                  <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
                    This will create the necessary tables in your D1 database. Ensure you have bound your D1 database with the name <strong>DB</strong> in Cloudflare settings.
                  </p>
                </div>

                <div className="bg-white p-3 rounded-xl border mb-4 max-h-32 overflow-y-auto font-mono text-[9px] text-slate-400">
                  {setupLogs.length === 0 ? "Ready..." : setupLogs.map((log, i) => (
                    <div key={i} className="mb-1">{">"} {log}</div>
                  ))}
                </div>

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
                    <><CheckCircle size={14} /> Ready!</>
                  ) : (
                    <><Database size={14} /> Start Setup</>
                  )}
                </button>
                
                <div className="mt-4 flex gap-2 justify-center">
                   <div className="px-2 py-1 bg-white rounded border text-[8px] font-bold text-slate-400">USER: owner</div>
                   <div className="px-2 py-1 bg-white rounded border text-[8px] font-bold text-slate-400">PASS: 1234</div>
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
