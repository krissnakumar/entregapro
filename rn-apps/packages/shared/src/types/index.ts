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

export enum InvoiceStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  ERROR = 'ERROR',
}

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
  permissions: string[];
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  address: string;
  latitude: number;
  longitude: number;
  notes?: string;
};

export type Driver = {
  id: string;
  userId: string;
  user: User;
  licenseNumber: string;
  phone: string;
  isOnline: boolean;
  lastSeen?: string;
  vehicleId?: string;
};

export type Vehicle = {
  id: string;
  vehicleNumber: string;
  type: string;
  capacity: string;
  fuelType: string;
  activeStatus: boolean;
  maintenanceDue?: string;
  driver?: Driver;
};

export type Delivery = {
  id: string;
  deliveryNumber: string;
  orderId?: string;
  driverId?: string;
  vehicleId?: string;
  customerId: string;
  customer?: Customer;
  driver?: Driver;
  vehicle?: Vehicle;
  materialType: string;
  quantity: string;
  weight?: string;
  deliveryAddress: string;
  latitude: number;
  longitude: number;
  scheduledTime: string;
  status: OrderStatus;
  startedAt?: string;
  completedAt?: string;
  eta_minutes?: number;
  route_distance?: number;
  loading_started_at?: string;
  transit_started_at?: string;
  proof_image_url?: string;
  signature_url?: string;
  pod_latitude?: number;
  pod_longitude?: number;
  pod_timestamp?: string;
  invoices?: Invoice[];
  total_km?: number;
  toll_cost?: number;
  expected_fuel_cost?: number;
  estimated_profit?: number;
};

export type Invoice = {
  id: string;
  invoiceNumber?: string;
  vendorName?: string;
  issueDate?: string;
  dueDate?: string;
  totalAmount?: number;
  currency: string;
  status: InvoiceStatus;
  fileUrl: string;
  fileType: string;
  deliveryId?: string;
  items?: InvoiceItem[];
  remarks?: string;
};

export type InvoiceItem = {
  id: string;
  invoiceId: string;
  description: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
};

export type Notification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export type FuelLog = {
  id: string;
  vehicleId: string;
  vehicle?: Vehicle;
  driverId?: string;
  driver?: Driver;
  fillDate: string;
  createdAt?: string;
  litersFilled?: number;
  costPerLiter?: number;
  totalCost?: number;
  odometer: number;
  stationName?: string;
  receiptPhotoUrl?: string;
  odometerPhotoUrl?: string;
  detectedAnomaly: boolean;
  anomalyReason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  jobNumber?: string;
  approvedById?: string;
  approvedBy?: User;
};

export type MaintenanceLog = {
  id: string;
  vehicleId: string;
  serviceType: string;
  serviceDate: string;
  cost: number;
  odometer: number;
  providerName?: string;
  notes?: string;
  nextDueDate?: string;
};

export type LoadingVerification = {
  id: string;
  deliveryId: string;
  verifiedByUserId: string;
  materialCount: number;
  invoiceMapped: boolean;
  packageQuantity: number;
  truckCapacityOk: boolean;
  status: 'VERIFIED' | 'CONFIRMED' | 'SEALED';
  sealedAt?: string;
  driverAcknowledged: boolean;
};

export type AuthResponse = {
  access_token: string;
  user: User;
};

export type Order = {
  id: string;
  orderNumber: string;
  dispatcherId?: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  deliveries?: Delivery[];
};

export type AnalyticsSnapshot = {
  id: string;
  timestamp: string;
  totalDeliveriesToday: number;
  trucksOnRoute: number;
  delayedDeliveries: number;
  activeDrivers: number;
  loadingInProgress: number;
  revenueToday: number;
  fuelCostToday: number;
  maintenanceAlertsCount: number;
  completedDeliveries: number;
  failedDeliveries: number;
  deliverySuccessRate: number;
};
