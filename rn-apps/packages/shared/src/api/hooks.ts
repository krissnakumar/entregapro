import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { api } from './client';
import type {
  Delivery,
  Customer,
  Driver,
  Vehicle,
  Invoice,
  Notification,
  User,
  FuelLog,
  MaintenanceLog,
  Order,
} from '../types';

// ─── Auth ───────────────────────────────────────────────────────────────────

export function useLogin() {
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api.post<{ access_token: string; user: User }>('/auth/login', data),
  });
}

// ─── Deliveries ─────────────────────────────────────────────────────────────

export function useDeliveries() {
  return useQuery({
    queryKey: ['deliveries'],
    queryFn: () => api.get<Delivery[]>('/deliveries'),
  });
}

export function useDriverDeliveries(): UseQueryResult<Delivery[]> {
  return useQuery({
    queryKey: ['driver-deliveries'],
    queryFn: () =>
      api.get<Delivery[]>('/deliveries?driver=true'),
  }) as UseQueryResult<Delivery[]>;
}

export function useDelivery(id: string) {
  return useQuery({
    queryKey: ['delivery', id],
    queryFn: () => api.get<Delivery>(`/deliveries/${id}`),
    enabled: !!id,
  });
}

export function useUpdateDeliveryStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      notes,
      lat,
      lng,
    }: {
      id: string;
      status: string;
      notes?: string;
      lat?: number;
      lng?: number;
    }) =>
      api.patch(`/deliveries/${id}/status`, { status, notes, lat, lng }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['driver-deliveries'] });
    },
  });
}

export function useUploadProof() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, image }: { id: string; image: string }) =>
      api.patch(`/deliveries/${id}/proof`, { image }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['driver-deliveries'] });
    },
  });
}

export function useSmartAssign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/deliveries/${id}/smart-assign`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    },
  });
}

// ─── Dispatch ───────────────────────────────────────────────────────────────

export function useDispatchOrders() {
  return useQuery({
    queryKey: ['dispatch-orders'],
    queryFn: () => api.get<Order[]>('/dispatch'),
  });
}

export function useCreateDispatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/dispatch', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] });
    },
  });
}

export function useAssignDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      driverId,
    }: {
      id: string;
      driverId: string | null;
    }) => api.patch(`/dispatch/${id}/assign`, { driverId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] });
    },
  });
}

// ─── POD (Proof of Delivery) ────────────────────────────────────────────────

export function useSubmitPOD() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      deliveryId,
      signatureUrl,
      photoUrl,
      lat,
      lng,
    }: {
      deliveryId: string;
      signatureUrl?: string;
      photoUrl?: string;
      lat?: number;
      lng?: number;
    }) => api.post(`/pod/${deliveryId}`, { signatureUrl, photoUrl, lat, lng }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['driver-deliveries'] });
    },
  });
}

// ─── Customers ──────────────────────────────────────────────────────────────

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get<Customer[]>('/customers'),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Customer>) => api.post('/customers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

// ─── Drivers ────────────────────────────────────────────────────────────────

export function useDrivers() {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: () => api.get<Driver[]>('/drivers'),
  });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/drivers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
}

// ─── Vehicles ───────────────────────────────────────────────────────────────

export function useVehicles() {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get<Vehicle[]>('/vehicles'),
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/vehicles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

// ─── Invoices ───────────────────────────────────────────────────────────────

export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.get<Invoice[]>('/invoices'),
  });
}

export function useConfirmInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/invoices/${id}/confirm`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

// ─── Fleet (Fuel & Maintenance) ─────────────────────────────────────────────

export function useFuelLogs(vehicleId?: string) {
  return useQuery({
    queryKey: ['fuel-logs', vehicleId],
    queryFn: () =>
      api.get<FuelLog[]>(
        `/fuel-logs${vehicleId ? `?vehicleId=${vehicleId}` : ''}`,
      ),
  });
}

export function useCreateFuelLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/fuel-logs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-logs'] });
    },
  });
}

export function useMaintenanceLogs(vehicleId?: string) {
  return useQuery({
    queryKey: ['maintenance-logs', vehicleId],
    queryFn: () =>
      api.get<MaintenanceLog[]>(
        `/maintenance-logs${vehicleId ? `?vehicleId=${vehicleId}` : ''}`,
      ),
  });
}

export function useCreateMaintenanceLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/maintenance-logs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-logs'] });
    },
  });
}

// ─── Notifications ──────────────────────────────────────────────────────────

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<Notification[]>('/notifications'),
    refetchInterval: 30000, // Poll every 30s
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// ─── Users (Admin only) ────────────────────────────────────────────────────

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<User[]>('/users'),
  });
}

// ─── Analytics ──────────────────────────────────────────────────────────────

export function useAnalytics() {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: () => api.get<any>('/analytics'),
  });
}

// ─── Reports ────────────────────────────────────────────────────────────────

export function useReports(type?: string) {
  return useQuery({
    queryKey: ['reports', type],
    queryFn: () => api.get<any[]>(`/reports${type ? `?type=${type}` : ''}`),
  });
}

// ─── Costs ──────────────────────────────────────────────────────────────────

export function useCalculateCosts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deliveryId: string) =>
      api.post(`/deliveries/${deliveryId}/calculate-costs`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    },
  });
}
