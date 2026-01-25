import React, { useState, useEffect } from 'react';
import { User, UserRole, AppSettings } from '../types.ts';
import { UtensilsCrossed, Lock, User as UserIcon, Loader2, Database, CheckCircle, AlertCircle, Info, RefreshCcw, Wrench } from 'lucide-react';
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
  const [connectionVerified, setConnectionVerified] = useState<boolean | null>(null);

  useEffect(() => {
    const checkOnStart = async () => {
      try {
        await db.checkConnection();
        setConnectionVerified(true);
      } catch (err) {
        setConnectionVerified(false);
      }
    };
    checkOnStart();
  }, []);

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
        setError('User not found. Try "owner" / "1234".');
      }
    } catch (err: any) {
      setError(err.message || 'Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const initializeDatabase = async () => {
    setInitializing(true);
    setSetupStatus('idle');
    setSetupLogs([]);
    try {
      addLog("Connecting to Cloud...");
      await db.execute(`CREATE TABLE IF NOT EXISTS staff (id TEXT PRIMARY KEY, username TEXT UNIQUE, role TEXT, name TEXT);`);
      await db.execute(`CREATE TABLE IF NOT EXISTS menu_items (id TEXT PRIMARY KEY, item_number TEXT, name TEXT, category TEXT, price REAL, is_available INTEGER, description TEXT);`);
      await db.execute(`CREATE TABLE IF NOT EXISTS tables (id TEXT PRIMARY KEY, number INTEGER, status TEXT, waitress_name TEXT);`);
      await db.execute(`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, table_id TEXT, table_number INTEGER, items TEXT, status TEXT, timestamp INTEGER, total REAL, waitress_name TEXT);`);
      await db.execute(`CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, type TEXT, amount REAL, description TEXT, timestamp INTEGER, category TEXT);`);
      await db.execute(`CREATE TABLE IF NOT EXISTS app_settings (id TEXT PRIMARY KEY, name TEXT, slogan TEXT, logo_url TEXT);`);
      await db.execute(`CREATE TABLE IF NOT EXISTS stock_entries (id TEXT PRIMARY KEY, item_name TEXT, quantity REAL, purchase_date INTEGER);`);

      addLog("Seeding Users...");
      for (const u of INITIAL_USERS) {
        await db.from('staff').insert([u]).catch(() => {});
      }
      
      addLog("Seeding Tables...");
      for (const t of INITIAL_TABLES) {
        await db.from('tables').insert([t]).catch(() => {});
      }
      
      addLog("Seeding Menu...");
      for (const m of INITIAL_MENU) {
        await db.from('menu_items').insert([{...m, is_available: m.is_available ? 1 : 0}]).catch(() => {});
      }

      await db.from('app_settings').insert([appSettings]).catch(() => {});

      setSetupStatus('success');
      addLog("Setup Completed!");
    } catch (err: any) {
      setError(err.message);
      setSetupStatus('error');
    } finally {
      setInitializing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white shadow-lg mb-4">
            <UtensilsCrossed size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{appSettings.name}</h1>
          <p className="text-slate-500 font-medium mt-1">{appSettings.slogan}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg flex items-center gap-3 text-sm font-medium">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                  placeholder="e.g. owner"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${connectionVerified === null ? 'bg-slate-300' : connectionVerified ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                {connectionVerified === null ? 'Checking Cloud...' : connectionVerified ? 'Cloud Connected' : 'Cloud Offline (Local Mode)'}
              </span>
            </div>
            <button 
              onClick={() => setShowSetup(!showSetup)}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider flex items-center gap-1.5"
            >
              <Wrench size={12} />
              Setup
            </button>
          </div>

          {showSetup && (
            <div className="mt-6 p-5 bg-slate-50 rounded-lg border border-slate-200 animate-in slide-in-from-top-2 duration-300">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Database size={16} className="text-indigo-600" />
                Initialize Environment
              </h3>
              <p className="text-[11px] text-slate-500 mb-4 font-medium leading-relaxed">
                If this is your first run, click below to build the database schema and seed default staff accounts.
              </p>
              
              <button 
                onClick={initializeDatabase}
                disabled={initializing}
                className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 mb-3"
              >
                {initializing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCcw size={14} />}
                Run Full Setup
              </button>

              {setupLogs.length > 0 && (
                <div className="space-y-1 mt-2">
                  {setupLogs.map((log, i) => (
                    <p key={i} className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      {log}
                    </p>
                  ))}
                </div>
              )}

              {setupStatus === 'success' && (
                <div className="mt-3 p-2 bg-emerald-50 border border-emerald-100 rounded flex items-center gap-2 text-[10px] text-emerald-700 font-bold">
                  <CheckCircle size={14} />
                  System ready. Log in with owner/1234
                </div>
              )}
            </div>
          )}
        </div>
        
        <p className="text-center text-slate-400 text-xs mt-8 font-medium">
          &copy; 2024 GustoFlow Ops. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;