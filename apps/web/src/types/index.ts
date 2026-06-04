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
  ACCEPTED = 'ACCEPTED',
  PICKING_UP = 'PICKING_UP',
  LOADED = 'LOADED',
  IN_TRANSIT = 'IN_TRANSIT',
  ARRIVED = 'ARRIVED',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum DeliveryStatus {
  CREATED = 'CREATED',
  PENDING_DISPATCH = 'PENDING_DISPATCH',
  ASSIGNED = 'ASSIGNED',
  DRIVER_NOTIFIED = 'DRIVER_NOTIFIED',
  ACCEPTED_BY_DRIVER = 'ACCEPTED_BY_DRIVER',
  LOADING_STARTED = 'LOADING_STARTED',
  LOADED = 'LOADED',
  IN_TRANSIT = 'IN_TRANSIT',
  ARRIVED = 'ARRIVED',
  DELIVERED = 'DELIVERED',
  PARTIALLY_DELIVERED = 'PARTIALLY_DELIVERED',
  FAILED = 'FAILED',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED',
}

export enum LoadingStatus {
  NOT_LOADED = 'NOT_LOADED',
  LOADING = 'LOADING',
  LOADED = 'LOADED',
  LOAD_ISSUE = 'LOAD_ISSUE',
}

export enum FuelRequestStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
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
  organizationId?: string;
  vehicleNumber?: string;
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
  deliveryNumber: string;
  orderId?: string;
  driverId?: string;
  vehicleId?: string;
  customerId: string;
  startedAt?: string;
  completedAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  failureReason?: string;
  status: OrderStatus;
  deliveryStatus: DeliveryStatus;
  loadingStatus: LoadingStatus;
  materialType: string;
  quantity: string;
  deliveryAddress: string;
  latitude: number;
  longitude: number;
  scheduledTime: string;

  // POD
  proof_image_url?: string;
  signature_url?: string;
  pod_latitude?: number;
  pod_longitude?: number;
  pod_timestamp?: string;

  // Relations
  customer?: { id: string; name: string; phone?: string; address: string; whatsapp?: string };
  driver?: { id: string; user?: { name: string }; phone?: string };
  vehicle?: { id: string; vehicleNumber: string; type: string };
  dispatcher?: { id: string; name: string };
  deliveryItems?: DeliveryItem[];
  loadBatchDeliveries?: { stopOrder: number; loadBatch?: LoadBatch }[];
  timeline?: TimelineEvent[];
}

export type DeliveryItem = {
  id: string;
  deliveryId: string;
  productName: string;
  quantity?: number;
  weight?: number;
  volume?: number;
  notes?: string;
}

export type LoadBatch = {
  id: string;
  batchCode: string;
  organizationId: string;
  driverId?: string;
  vehicleId?: string;
  dispatcherId?: string;
  status: DeliveryStatus;
  totalWeight?: number;
  totalVolume?: number;
  totalDeliveries: number;
  routeDistanceKm?: number;
  estimatedDurationMinutes?: number;
  approvedAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;

  // Relations
  driver?: Driver;
  vehicle?: { id: string; vehicleNumber: string; type: string };
  deliveries?: LoadBatchDelivery[];
}

export type LoadBatchDelivery = {
  id: string;
  loadBatchId: string;
  deliveryId: string;
  stopOrder: number;
  delivery?: Delivery;
}

export type TimelineEvent = {
  id: string;
  deliveryId: string;
  actorId?: string;
  actorRole?: string;
  eventType: string;
  oldStatus?: string;
  newStatus?: string;
  note?: string;
  latitude?: number;
  longitude?: number;
  photoUrl?: string;
  signatureUrl?: string;
  metadata?: any;
  createdAt: string;
}

export type FuelRequest = {
  id: string;
  organizationId: string;
  driverId: string;
  vehicleId: string;
  loadBatchId?: string;
  amountRequested?: number;
  fuelLiters?: number;
  fuelStation?: string;
  reason?: string;
  status: FuelRequestStatus;
  approvedByDispatcherId?: string;
  approvedAt?: string;
  rejectedReason?: string;
  receiptPhotoUrl?: string;
  createdAt: string;

  // Relations
  driver?: Driver;
  vehicle?: { id: string; vehicleNumber: string; type: string };
  approvedBy?: { id: string; name: string };
}

export type Notification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  type?: string;
  recipientRole?: string;
  payload?: any;
  createdAt: string;
}

export type AuthResponse = {
  access_token: string;
  user: User;
}
