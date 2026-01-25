
import React, { useState } from 'react';
import { User, UserRole, AppSettings } from '../types.ts';
import { UtensilsCrossed, Lock, User as UserIcon, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient.ts';

interface LoginProps {
  onLogin: (user: User) => void;
  appSettings: AppSettings;
}

const Login: React.FC<LoginProps> = ({ onLogin, appSettings }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Fetch staff member from dynamic database table
      const { data: staff, error: dbError } = await supabase
        .from('staff')
        .select('*')
        .eq('username', username.toLowerCase())
        .maybeSingle();

      if (dbError) throw dbError;

      if (staff && password.length >= 4) {
        onLogin({
          id: staff.id,
          username: staff.username,
          name: staff.name,
          role: staff.role as UserRole
        });
      } else {
        setError('Invalid credentials. Check with your manager.');
      }
    } catch (err) {
      setError('Connection failed. Check your Supabase configuration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-2xl mb-4 shadow-lg">
            {appSettings.logo_url ? (
               <img src={appSettings.logo_url} alt="Logo" className="w-10 h-10 object-contain" />
            ) : (
              <UtensilsCrossed size={40} className="text-white" />
            )}
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">{appSettings.name}</h1>
          <p className="text-slate-400 font-medium">{appSettings.slogan}</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Staff Username</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                  placeholder="e.g. elena"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Secret Code (Min 4 chars)</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                  placeholder="••••"
                  required
                />
              </div>
            </div>

            {error && <p className="text-rose-500 text-sm font-medium text-center">{error}</p>}

            <button 
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : 'Login to Workspace'}
            </button>
          </form>
          
          <p className="mt-8 text-center text-xs text-slate-400 font-medium">
            Contact Owner to add or rename staff accounts.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
