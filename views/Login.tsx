
import React, { useState } from 'react';
import { User, AppSettings } from '../types.ts';
import { UtensilsCrossed, Lock, User as UserIcon, Loader2 } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
  appSettings: AppSettings;
}

const Login: React.FC<LoginProps> = ({ onLogin, users, appSettings }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = users.find(u => u.username === username.toLowerCase());
      if (user && password.length >= 4) {
        onLogin(user);
      } else {
        setError('Invalid credentials. Hint: owner/chef/cashier/waitress (pwd: 1234)');
      }
    } catch (err) {
      setError('Login failed. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-500/20">
            {appSettings.logo_url ? (
               <img src={appSettings.logo_url} alt="Logo" className="w-10 h-10 object-contain invert" />
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
              <label className="block text-sm font-semibold text-slate-700 mb-2">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                  placeholder="e.g., owner"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && <p className="text-rose-500 text-sm font-medium animate-pulse text-center">{error}</p>}

            <button 
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="animate-spin mr-2" size={20} />
              ) : (
                'Sync & Sign In'
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100 flex flex-wrap gap-2 justify-center">
            {['owner', 'cashier', 'chef', 'waitress'].map(role => (
              <button
                key={role}
                onClick={() => { setUsername(role); setPassword('1234'); }}
                className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-full transition-colors"
              >
                Mock {role}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
