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
  X,
  Users
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
          { icon: UtensilsCrossed, label: 'Menu List', view: 'Dashboard' },
          { icon: Package, label: 'Stock Audit', view: 'Dashboard' },
          { icon: CreditCard, label: 'Financials', view: 'Dashboard' },
          { icon: Users, label: 'Customers', view: 'CustomerData' },
        ];
      case UserRole.CASHIER:
        return [
          { icon: CreditCard, label: 'Billing Terminal', view: 'Dashboard' },
          { icon: ClipboardList, label: 'Today\'s Activity', view: 'Dashboard' },
          { icon: Users, label: 'Customer Leads', view: 'CustomerData' },
          { icon: Package, label: 'Daily Expenses', view: 'Dashboard' },
        ];
      case UserRole.CHEF:
        return [
          { icon: ClipboardList, label: 'Kitchen Queue', view: 'Dashboard' },
          { icon: Package, label: 'Supply Check', view: 'Dashboard' },
        ];
      case UserRole.WAITRESS:
        return [
          { icon: TableIcon, label: 'Main Floor', view: 'Dashboard' },
          { icon: Users, label: 'Customer Leads', view: 'CustomerData' },
          { icon: ClipboardList, label: 'My Performance', view: 'MyOrders' },
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
    <aside className={`fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white flex flex-col z-50 shadow-xl transition-transform duration-300 ease-in-out border-r border-slate-800 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/10">
              {appSettings.logo_url ? (
                <img src={appSettings.logo_url} alt="Logo" className="w-[20px] h-[20px] object-contain" />
              ) : (
                <UtensilsCrossed size={20} className="text-white" />
              )}
            </div>
            <span className="text-lg font-bold tracking-tight truncate max-w-[130px]">{appSettings.name}</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white lg:hidden transition-colors"><X size={18} /></button>
        </div>

        <nav className="space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-3 mb-3">Control Center</p>
          {getNavItems().map((item, idx) => (
            <button
              key={idx}
              onClick={() => navigate(item.view)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all group ${activeView === item.view && activeView !== 'Settings' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <item.icon size={18} className={`${activeView === item.view && activeView !== 'Settings' ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'} transition-colors`} />
              <span className="text-[13px] tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800 space-y-1">
          {role === UserRole.OWNER && (
            <button 
              onClick={() => navigate('Settings')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${activeView === 'Settings' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <Settings size={18} className={activeView === 'Settings' ? 'text-white' : 'text-slate-500'} />
              <span className="text-[13px] tracking-wide">Settings</span>
            </button>
          )}
          
          <div className="mt-4 p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center font-bold text-xs text-indigo-400 border border-slate-600">
              {userName.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold truncate text-slate-200">{userName}</p>
              <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">{role.toLowerCase()}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;