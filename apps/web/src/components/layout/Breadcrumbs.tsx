import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const labelMap: Record<string, string> = {
  '': 'Visão Geral',
  analytics: 'Analytics',
  orders: 'Pedidos',
  dispatch: 'Central de Despacho',
  tracking: 'Rastreamento',
  routes: 'Rotas',
  drivers: 'Motoristas',
  vehicles: 'Veículos',
  fuel: 'Combustível',
  maintenance: 'Manutenção',
  customers: 'Clientes',
  pod: 'Comprovantes',
  invoices: 'Faturas',
  nfe: 'NF-e Eletrônica',
  materials: 'Materiais',
  capacity: 'Capacidade',
  jobsites: 'Obras',
  loading: 'Verificação de Carga',
  users: 'Usuários',
  roles: 'Permissões',
  plan: 'Plano',
  settings: 'Configurações',
  profile: 'Perfil',
};

export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-slate-500">
      <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">
        <Home size={14} />
      </Link>
      {segments.slice(1).map((segment, i) => {
        const path = '/' + segments.slice(0, i + 2).join('/');
        const label = labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
        const isLast = i === segments.length - 2;
        return (
          <span key={segment} className="flex items-center gap-1">
            <ChevronRight size={12} className="text-slate-300" />
            {isLast ? (
              <span className="text-slate-700 font-medium">{label}</span>
            ) : (
              <Link to={path} className="hover:text-indigo-600 transition-colors">{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
