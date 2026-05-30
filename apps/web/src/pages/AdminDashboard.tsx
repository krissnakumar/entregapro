import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useTheme } from '../store/ThemeProvider';
import Overview from '../components/Overview';
import CustomersList from '../components/CustomersList';
import DriversList from '../components/DriversList';
import VehiclesList from '../components/VehiclesList';
import UserManagement from '../components/UserManagement';
import ReportsPage from './Reports';
import ProfilePage from './Profile';
import SettingsPage from './Settings';
import InvoicesPage from './Invoices';
import NotificationsDropdown from '../components/NotificationsDropdown';
import { LoadingVerificationScreen } from '../components/LoadingVerificationScreen';
import { FuelMaintenanceModule } from '../components/FuelMaintenanceModule';
import { ExcelBillingImportScreen } from '../components/ExcelBillingImportScreen';
import { 
  LogOut, 
  ShieldCheck, 
  Users, 
  Truck, 
  ClipboardList, 
  MapPin, 
  BarChart3, 
  Settings,
  Menu,
  X,
  Sun,
  Moon,
  Search,
  Key,
  Database,
  Smartphone,
  TrendingUp,
  Files,
  Map as LucideMap
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    toast.success('Admin session ended');
    navigate('/login');
  };

  const navGroups = [
    {
      title: 'Operações',
      items: [
        { name: 'Controle Ops', path: '/dashboard', icon: BarChart3 },
        { name: 'Entregas Ativas', path: '/dashboard/deliveries', icon: ClipboardList },
      ]
    },
    {
      title: 'Logística',
      items: [
        { name: 'Clientes', path: '/dashboard/customers', icon: Database },
        { name: 'Motoristas', path: '/dashboard/drivers', icon: Users },
        { name: 'Frota Ativa', path: '/dashboard/vehicles', icon: Truck },
        { name: 'Combustível & Manut', path: '/dashboard/fuel', icon: Settings },
      ]
    },
    {
      title: 'Inteligência',
      items: [
        { name: 'Faturas e Notas', path: '/dashboard/invoices', icon: Files },
        { name: 'Logs de Operação', path: '/dashboard/reports', icon: ClipboardList },
      ]
    },
    {
      title: 'Sistema',
      items: [
        { name: 'Usuários', path: '/dashboard/users', icon: Users },
        { name: 'Permissões', path: '/dashboard/roles', icon: Key },
        { name: 'Configurações', path: '/dashboard/settings', icon: Settings },
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-white text-slate-900 overflow-hidden font-sans select-none">
      
      {/* MOBILE SIDEBAR BACKDROP */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-2xs z-20 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Admin Sidebar - Clean Pure White Layout */}
      <aside 
        className={cn(
          "bg-white border-r border-slate-200 text-slate-700 transition-all duration-300 flex flex-col z-30 absolute md:relative inset-y-0 left-0 shadow-2xl md:shadow-none",
          isSidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full md:w-20 md:translate-x-0 overflow-hidden"
        )}
      >
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
          {isSidebarOpen && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="p-2 bg-indigo-600 rounded-xl shadow-xs text-white shrink-0">
                <ShieldCheck size={20} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col min-w-0">
                <h2 className="text-xs font-black tracking-tight text-slate-900 leading-none uppercase truncate">EntregaPRO</h2>
                <span className="text-[8px] font-bold text-indigo-600 tracking-widest mt-0.5 block truncate">ADMIN REPORTS</span>
              </div>
            </div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors ml-auto text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer outline-none"
            title="Alternar Menu Central"
          >
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto custom-scrollbar">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              {isSidebarOpen && (
                <h3 className="px-3 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2 block truncate">
                  {group.title}
                </h3>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link 
                      key={item.name}
                      to={item.path} 
                      onClick={() => {
                        if (window.innerWidth < 768) setIsSidebarOpen(false);
                      }}
                      className={cn(
                        "flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all group relative font-medium text-xs",
                        isActive 
                          ? "bg-indigo-50 text-indigo-700 font-bold" 
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <item.icon size={18} className={cn("shrink-0", isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600 transition-colors")} />
                      {isSidebarOpen && <span className="truncate tracking-tight">{item.name}</span>}
                      {isActive && !isSidebarOpen && (
                        <div className="absolute left-0 w-1 h-5 bg-indigo-600 rounded-r-full hidden md:block" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-1 bg-slate-50/50 shrink-0">
          <div className="px-3 py-1 text-[8px] font-black uppercase text-slate-400 tracking-widest block truncate">
            {isSidebarOpen ? 'Controle de Sessão' : 'SYS'}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 p-3 w-full rounded-xl hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-all cursor-pointer outline-none font-bold text-xs"
          >
            <LogOut size={18} className="shrink-0" />
            {isSidebarOpen && <span className="truncate">Encerrar Sessão</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area - Responsive Pure White Layout */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-white">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shrink-0 z-10 relative">
          <div className="flex items-center gap-3">
             <button
               onClick={() => setIsSidebarOpen(!isSidebarOpen)}
               className="p-2 hover:bg-slate-50 rounded-xl text-slate-600 md:hidden transition-colors cursor-pointer outline-none"
             >
               <Menu size={18} />
             </button>
             <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               Sistemas Operacionais Conectados
             </div>
          </div>
          <div className="flex items-center space-x-3 sm:space-x-6">
            <NotificationsDropdown />
            <div className="flex items-center space-x-3 sm:space-x-4 border-l border-slate-200 pl-3 sm:pl-6 min-w-0">
              <div className="text-right hidden sm:block leading-tight truncate">
                <p className="text-xs font-black text-slate-900 truncate">{user?.name || 'Administrador Global'}</p>
                <p className="text-[9px] text-indigo-600 uppercase font-black tracking-widest mt-0.5">
                  {user?.role || 'ADMIN'}
                </p>
              </div>
              <div 
                className="h-9 w-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-xs cursor-pointer hover:bg-indigo-700 transition-colors shadow-xs shrink-0" 
                onClick={() => navigate('/dashboard/profile')}
                title="Configurações do Perfil"
              >
                {user?.name?.charAt(0) || 'A'}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden bg-white">
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-white">
            <div className="max-w-7xl mx-auto">
              <Routes>
                <Route path="" element={<Overview />} />
                <Route path="customers" element={<CustomersList />} />
                <Route path="drivers" element={<DriversList />} />
                <Route path="vehicles" element={<VehiclesList />} />
                <Route path="deliveries" element={<ReportsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="analytics" element={<Overview />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="roles" element={<UserManagement />} />
                <Route path="invoices" element={<InvoicesPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="fuel" element={<div className="py-6"><FuelMaintenanceModule /></div>} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
