export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  DISPATCHER = 'DISPATCHER',
  DRIVER = 'DRIVER',
  HELPER = 'HELPER',
  ACCOUNTANT = 'ACCOUNTANT',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  LOADING = 'LOADING',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
  avatarUrl?: string;
  permissions: string[];
}

export type Order = {
  id: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  deliveryLat: number;
  deliveryLng: number;
  status: OrderStatus;
  dispatcherId?: string;
  createdAt: string;
  updatedAt: string;
}

export type Driver = {
  id: string;
  userId: string;
  user: User;
  isOnline: boolean;
  lastSeen?: string;
}

export type Delivery = {
  id: string;
  orderId: string;
  driverId: string;
  startedAt?: string;
  completedAt?: string;
  status: OrderStatus;
  materialType: string;
  quantity: string;
  deliveryAddress: string;
  latitude: number;
  longitude: number;
  
  // POD
  proof_image_url?: string;
  signature_url?: string;
  pod_latitude?: number;
  pod_longitude?: number;
  pod_timestamp?: string;
  
  // Crew
  helpers?: Driver[];
}

export type AuthResponse = {
  access_token: string;
  user: User;
}
