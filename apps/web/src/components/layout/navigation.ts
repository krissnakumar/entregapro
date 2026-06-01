import {
  LayoutDashboard, ClipboardList, Map, Truck, Users, Building2,
  Settings, CreditCard, Fuel, Wrench, FileText, Route, MapPin,
  HardHat, Package, Scale, Warehouse, UserCog, ShieldCheck,
  BarChart3, ChevronDown, Receipt, type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  label: string;
  path?: string;
  icon: LucideIcon;
  children?: { label: string; path: string }[];
};

export const navigation: { title: string; items: NavItem[] }[] = [
  {
    title: 'Dashboard',
    items: [
      { label: 'Visão Geral', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Analytics', path: '/dashboard/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Operações',
    items: [
      { label: 'Pedidos', path: '/dashboard/orders', icon: ClipboardList },
      { label: 'Central de Despacho', path: '/dashboard/dispatch', icon: Route },
      { label: 'Rastreamento ao Vivo', path: '/dashboard/tracking', icon: MapPin },
      { label: 'Planejamento de Rotas', path: '/dashboard/routes', icon: Map },
    ],
  },
  {
    title: 'Frota',
    items: [
      { label: 'Motoristas', path: '/dashboard/drivers', icon: Users },
      { label: 'Veículos', path: '/dashboard/vehicles', icon: Truck },
      { label: 'Combustível', path: '/dashboard/fuel', icon: Fuel },
      { label: 'Manutenção', path: '/dashboard/maintenance', icon: Wrench },
    ],
  },
  {
    title: 'Clientes',
    items: [
      { label: 'Clientes', path: '/dashboard/customers', icon: Building2 },
      { label: 'Comprovantes', path: '/dashboard/pod', icon: FileText },
      { label: 'Faturas', path: '/dashboard/invoices', icon: FileText },
      { label: 'NF-e Eletrônica', path: '/dashboard/nfe', icon: Receipt },
    ],
  },
  {
    title: 'Logística Construção',
    items: [
      { label: 'Materiais', path: '/dashboard/materials', icon: Package },
      { label: 'Capacidade de Carga', path: '/dashboard/capacity', icon: Scale },
      { label: 'Obras', path: '/dashboard/jobsites', icon: HardHat },
      { label: 'Verificação de Carga', path: '/dashboard/loading', icon: Warehouse },
    ],
  },
  {
    title: 'Administração',
    items: [
      { label: 'Usuários', path: '/dashboard/users', icon: UserCog },
      { label: 'Permissões', path: '/dashboard/roles', icon: ShieldCheck },
      { label: 'Plano', path: '/dashboard/plan', icon: CreditCard },
      { label: 'Configurações', path: '/dashboard/settings', icon: Settings },
    ],
  },
];
