export type User = {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'DISPATCHER' | 'DRIVER' | 'ACCOUNTANT';
  permissions: string[];
  active_status: boolean;
};

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  user: User;
};

export type Customer = {
  id: string;
  name: string;
  email?: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  notes?: string;
};

export type Driver = {
  id: string;
  name: string;
  phone: string;
  licenseNumber?: string;
  status?: string;
  isOnline: boolean;
  vehicleNumber?: string;
};

export type Vehicle = {
  id: string;
  vehicleNumber: string;
  type: string;
  capacity: string;
  fuelType: string;
  activeStatus: boolean;
  status?: string;
};

export type Delivery = {
  id: string;
  deliveryNumber: string;
  status: string;
  materialType: string;
  quantity: string;
  deliveryAddress: string;
  customerName?: string;
  customerPhone?: string;
  driverName?: string;
  vehicleNumber?: string;
  scheduledTime?: string;
  etaMinutes?: number;
  totalKm?: number;
  estimatedProfit?: number;
};

export type KpiData = {
  dailyCount: number;
  completedToday: number;
  delayedCount: number;
  activeDrivers: number;
  fleetUtilization: number;
  avgDeliveryTime: number;
  weeklyDistribution: number[];
  topDrivers: { name: string; deliveries: number }[];
};
