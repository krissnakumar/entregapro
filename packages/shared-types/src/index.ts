export enum Role {
  ADMIN = 'ADMIN',
  DISPATCHER = 'DISPATCHER',
  DRIVER = 'DRIVER',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  LOADING = 'LOADING',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  dispatcherId?: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  deliveries: Delivery[];
}

export interface Delivery {
  id: string;
  deliveryNumber: string;
  orderId?: string;
  customerId: string;
  driverId?: string;
  vehicleId?: string;
  status: OrderStatus;
  latitude: number;
  longitude: number;
  deliveryAddress: string;
  customer?: {
    id: string;
    name: string;
  };
}

export interface AuthResponse {
  access_token: string;
  user: User;
}
