
import React from 'react';
import { UserRole, AppSettings } from '../types.ts';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  ClipboardList, 
  CreditCard, 
  Package, 
  Table as TableIcon, 
  Settings,
  X
} from 'lucide-react';

interface SidebarProps {
  role: UserRole;
  onLogout: () => void;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
  onViewChange: (view: string) => void;
  activeView: string;
  appSettings: AppSettings;
}

const Sidebar: React.FC<SidebarProps> = ({ role, userName, isOpen, onClose, onViewChange, activeView, appSettings }) => {
  const getNavItems = () => {
    switch (role) {
      case UserRole.OWNER:
        return [
          { icon: LayoutDashboard, label: 'Analytics', view: 'Dashboard' },
          { icon: UtensilsCrossed, label: 'Menu Management', view: 'Dashboard' },
          { icon: Package, label: 'Stock Audit', view: 'Dashboard' },
          { icon: CreditCard, label: 'Cash Book', view: 'Dashboard' },
        ];
      case UserRole.CASHIER:
        return [
          { icon: CreditCard, label: 'Billing', view: 'Dashboard' },
          { icon: ClipboardList, label: 'Today\'s Orders', view: 'Dashboard' },
          { icon: Package, label: 'Expenses', view: 'Dashboard' },
        ];
      case UserRole.CHEF:
        return [
          { icon: ClipboardList, label: 'Active Kitchen', view: 'Dashboard' },
          { icon: Package, label: 'Inventory', view: 'Dashboard' },
        ];
      case UserRole.WAITRESS:
        return [
          { icon: TableIcon, label: 'Table Layout', view: 'Dashboard' },
          { icon: ClipboardList, label: 'My Orders', view: 'Dashboard' },
        ];
      default:
        return [];
    }
  };

  const navigate = (view: string) => {
    onViewChange(view);
    if (window.innerWidth < 1024) onClose();
  };

  return (
    <aside className={`fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white flex flex-col z-50 shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/20">
              {appSettings.logo_url ? (
                <img src={appSettings.logo_url} alt="Logo" className="w-[22px] h-[22px] object-contain invert" />
              ) : (
                <UtensilsCrossed size={22} className="text-white" />
              )}
            </div>
            <span className="text-xl font-black tracking-tighter truncate max-w-[140px]">{appSettings.name}</span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="space-y-1.5">
          {getNavItems().map((item, idx) => (
            <button
              key={idx}
              onClick={() => navigate(item.view)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${activeView === item.view && activeView !== 'Settings' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
            >
              <item.icon size={18} className={`${activeView === item.view && activeView !== 'Settings' ? 'text-white' : 'group-hover:scale-110 group-hover:text-indigo-400'} transition-all`} />
              <span className="text-sm font-bold tracking-tight">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-slate-800/50 space-y-4">
        {role === UserRole.OWNER && (
          <button 
            onClick={() => navigate('Settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeView === 'Settings' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
          >
            <Settings size={18} />
            <span className="text-sm font-bold">Settings</span>
          </button>
        )}
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/30 rounded-2xl border border-slate-700/30">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-xs text-white uppercase">
            {userName.charAt(0)}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-black truncate text-slate-200">{userName}</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{role.toLowerCase()}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
