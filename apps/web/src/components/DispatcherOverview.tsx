import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  ClipboardList,
  Truck,
  UserCheck,
  AlertTriangle,
  PackageCheck,
} from 'lucide-react';
import { cn } from '../lib/utils';

const DispatcherOverview = () => {
  const { data: deliveries } = useQuery({
    queryKey: ['dispatcher-deliveries'],
    queryFn: () => api.get<any[]>('/deliveries?take=100'),
    refetchInterval: 15_000,
  });

  const { data: driversData } = useQuery({
    queryKey: ['drivers-performance'],
    queryFn: () => api.get<any[]>('/drivers?take=100'),
  });

  const deliveriesList = deliveries?.data || deliveries || [];
  const driversList = driversData?.data || driversData || [];

  const stats = [
    {
      title: 'Pendentes',
      value: deliveriesList.filter((d: any) => d.status === 'PENDING').length,
      icon: ClipboardList,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      title: 'Em Andamento',
      value: deliveriesList.filter((d: any) =>
        ['ASSIGNED', 'LOADED', 'IN_TRANSIT'].includes(d.status)
      ).length,
      icon: PackageCheck,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Entregues Hoje',
      value: deliveriesList.filter((d: any) => d.status === 'DELIVERED').length,
      icon: Truck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Motoristas Online',
      value: driversList.filter((d: any) => d.isOnline).length,
      icon: UserCheck,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      title: 'Com Atraso',
      value: deliveriesList.filter((d: any) =>
        d.status !== 'DELIVERED' &&
        d.status !== 'CANCELLED' &&
        d.scheduledTime &&
        new Date(d.scheduledTime) < new Date()
      ).length,
      icon: AlertTriangle,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
      {stats.map((stat) => (
        <div
          key={stat.title}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all"
        >
          <div className={cn("p-2.5 rounded-xl w-fit mb-3", stat.bg)}>
            <stat.icon className={stat.color} size={20} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            {stat.title}
          </p>
          <p className="text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
        </div>
      ))}
    </div>
  );
};

export default DispatcherOverview;
