
import React from 'react';
import { UserRole } from '../types';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  ClipboardList, 
  CreditCard, 
  Package, 
  Table as TableIcon, 
  LogOut,
  Settings
} from 'lucide-react';

interface SidebarProps {
  role: UserRole;
  onLogout: () => void;
  userName: string;
}

const Sidebar: React.FC<SidebarProps> = ({ role, onLogout, userName }) => {
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
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white flex flex-col z-50">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-indigo-600 rounded-lg">
            <UtensilsCrossed size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight">GustoFlow</span>
        </div>

        <nav className="space-y-1">
          {getNavItems().map((item, idx) => (
            <button
              key={idx}
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all group"
            >
              <item.icon size={20} className="group-hover:scale-110 transition-transform" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-slate-800 space-y-4">
        <button className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
          <Settings size={20} />
          <span>Settings</span>
        </button>
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold">
            {userName.charAt(0)}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{userName}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
