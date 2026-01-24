
import React from 'react';
import { UserRole } from '../types.ts';
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
}

const Sidebar: React.FC<SidebarProps> = ({ role, userName, isOpen, onClose }) => {
  const getNavItems = () => {
    switch (role) {
      case UserRole.OWNER:
        return [
          { icon: LayoutDashboard, label: 'Analytics' },
          { icon: UtensilsCrossed, label: 'Menu Management' },
          { icon: Package, label: 'Stock Audit' },
          { icon: CreditCard, label: 'Cash Book' },
        ];
      case UserRole.CASHIER:
        return [
          { icon: CreditCard, label: 'Billing' },
          { icon: ClipboardList, label: 'Today\'s Orders' },
          { icon: Package, label: 'Expenses' },
        ];
      case UserRole.CHEF:
        return [
          { icon: ClipboardList, label: 'Active Kitchen' },
          { icon: Package, label: 'Inventory' },
        ];
      case UserRole.WAITRESS:
        return [
          { icon: TableIcon, label: 'Table Layout' },
          { icon: ClipboardList, label: 'My Orders' },
        ];
      default:
        return [];
    }
  };

  return (
    <aside className={`fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white flex flex-col z-50 shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/20">
              <UtensilsCrossed size={22} className="text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter">GustoFlow</span>
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
              onClick={onClose}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl transition-all group"
            >
              <item.icon size={18} className="group-hover:scale-110 group-hover:text-indigo-400 transition-all" />
              <span className="text-sm font-bold tracking-tight">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-slate-800/50 space-y-4">
        <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl transition-all">
          <Settings size={18} />
          <span className="text-sm font-bold">Settings</span>
        </button>
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/30 rounded-2xl border border-slate-700/30">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-xs text-white">
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
