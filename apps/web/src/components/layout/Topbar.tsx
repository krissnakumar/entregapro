import { useAuthStore } from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { NotificationsDropdown } from '../NotificationsDropdown';
import { LogOut, Menu, User } from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumbs } from './Breadcrumbs';

interface TopbarProps {
  onMenuToggle: () => void;
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Sessão encerrada');
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 lg:hidden cursor-pointer"
        >
          <Menu size={20} />
        </button>
        <Breadcrumbs />
      </div>

      <div className="flex items-center gap-3">
        <NotificationsDropdown />
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
            <p className="text-[10px] text-indigo-600 uppercase font-bold tracking-wider">{user?.role}</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/profile')}
            className="h-9 w-9 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-sm font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            {user?.name?.charAt(0) || <User size={16} />}
          </button>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
