# EntregaPRO - Frontend ↔ Backend Data Flow Mapping

## Architecture Overview

```
[Web App (React)]     [RN Apps (Expo)]     [Flutter Apps]
       |                     |                    |
       |    REST + Socket.IO    |                    |
       v                     v                    v
  ┌─────────────────────────────────────────────────────┐
  │              NestJS API (Port 3001)                   │
  │  Controllers → Services → Prisma ORM → PostgreSQL    │
  │  WebSocket Gateway (Socket.IO)                        │
  │  BullMQ Queues (Redis)                                │
  └──────────────────────┬──────────────────────────────┘
                         │
                         v
              ┌─────────────────────┐
              │   PostgreSQL + PostGIS │
              │   (Supabase)           │
              └─────────────────────┘
```

---

## Module-by-Module Data Flow

### 1. Authentication

```
Frontend               → API Endpoint              → DB Table
──────────────────────────────────────────────────────────────────
Login (email+password) → POST /auth/login           users
Logout                 → POST /auth/logout           users.refreshToken
Refresh Token          → POST /auth/refresh          users.refreshToken
Change Password        → POST /auth/change-password  users.password_hash
```

**Flow:** Frontend sends credentials → API validates via Argon2 → Returns JWT (15m) + Refresh Token (7d) → Frontend stores token in Zustand/SharedPreferences → All subsequent requests include `Authorization: Bearer <token>`.

**RBAC:** JWT payload includes `role` + `permissions[]`. Guards check these against route metadata.

---

### 2. Dashboard & KPIs

```
Frontend                          → API Endpoint          → DB Tables
─────────────────────────────────────────────────────────────────────────
Admin Dashboard Overview          → GET /reports/executive deliveries, drivers, vehicles
Admin Dashboard KPIs              → GET /deliveries       deliveries
Analytics Page                    → GET /analytics/performance deliveries
Driver Leaderboard                → GET /analytics/leaderboard drivers, deliveries
```

**Data computed server-side:**
- `dailyCount`: deliveries created today
- `delayedCount`: non-completed deliveries past scheduled time
- `activeDrivers`: drivers with `isOnline = true`
- `fleetUtilization`: ratio of vehicles with active deliveries
- `completedToday`: deliveries with status DELIVERED today
- `avgDeliveryTime`: average minutes from IN_TRANSIT to DELIVERED
- `weeklyDistribution`: deliveries per day for last 7 days
- `topDrivers`: drivers ranked by completed delivery count

---

### 3. Customers

```
Frontend                 → API Endpoint          → DB Table
─────────────────────────────────────────────────────────────────
List Customers           → GET /customers         customers
Get Customer             → GET /customers/:id     customers + deliveries
Create Customer          → POST /customers        customers
```

**Data:** name, email, phone, whatsapp, address, latitude, longitude, notes

---

### 4. Drivers

```
Frontend                 → API Endpoint        → DB Tables
───────────────────────────────────────────────────────────────────
List Drivers             → GET /drivers        drivers + users + vehicles
Get Driver               → GET /drivers/:id    drivers + users + deliveries
Create Driver            → POST /drivers       users + drivers
```

**Create flow:** Creates User (role=DRIVER, default password "123456") + Driver profile.

---

### 5. Vehicles

```
Frontend                 → API Endpoint        → DB Table
───────────────────────────────────────────────────────────────────
List Vehicles            → GET /vehicles        vehicles
Get Vehicle              → GET /vehicles/:id    vehicles + deliveries
Create Vehicle           → POST /vehicles       vehicles
```

**Data:** vehicleNumber, type, capacity, fuelType, activeStatus, maintenanceDue

---

### 6. Deliveries

```
Frontend                       → API Endpoint                → DB Tables
───────────────────────────────────────────────────────────────────────────────────
List Deliveries                → GET /deliveries              deliveries + customers + drivers + vehicles
Get Delivery Detail            → GET /deliveries/:id          deliveries + statusLogs
Update Status                  → PATCH /deliveries/:id/status deliveries + delivery_status_logs
Upload Proof Photo             → PATCH /deliveries/:id/proof  deliveries
Smart Assign Driver            → POST /deliveries/:id/smart-assign deliveries + drivers + vehicles
Calculate Costs                → POST /deliveries/:id/calculate-costs deliveries
Create Dispatch Order          → POST /dispatch               orders + deliveries + customers
Assign Driver (Dispatch)       → PATCH /dispatch/:id/assign   deliveries (with FOR UPDATE lock)
Route Optimization             → POST /dispatch/optimize      (stub - placeholder)
```

**Status Flow:**
```
PENDING → ASSIGNED → LOADING → IN_TRANSIT → DELIVERED
                                            → CANCELLED (any state)
```

**Status Side Effects:**
- `LOADING` → sets `loading_started_at`
- `IN_TRANSIT` → sets `transit_started_at`, sends WhatsApp tracking link
- `DELIVERED` → sets `completedAt`, sends WhatsApp confirmation

**Smart Assign Logic:**
1. Find first active vehicle (no active delivery)
2. Find first available driver (no active delivery, isOnline)
3. Apply FOR UPDATE row locks for atomicity
4. Fallback: any vehicle/driver if none found
5. Auto-calculate costs

**Cost Calculation:**
- Distance: 85.3 km (simulated with base rate)
- Fuel: Diesel 4.5km/L, others 6.0km/L
- Costs: fuel + toll + driver (R$0.45/km) + assistant (R$0.25/km) + maintenance (R$0.12/km)
- Profit: baseline R$450 revenue - total cost

---

### 7. Fleet (Fuel & Maintenance)

```
Frontend                      → API Endpoint         → DB Table
───────────────────────────────────────────────────────────────────────────
List Fuel Logs                → GET /fuel-logs        fuel_logs + vehicles + drivers
Create Fuel Log               → POST /fuel-logs       fuel_logs
List Maintenance Logs         → GET /maintenance-logs maintenance_logs + vehicles
Create Maintenance Log        → POST /maintenance-logs maintenance_logs
```

**Fuel Log Data:** vehicleId, driverId, litersFilled, costPerLiter, totalCost, odometer, stationName, receiptPhotoUrl, odometerPhotoUrl
**Maintenance Log Data:** vehicleId, serviceType, serviceDate, cost, odometer, providerName, notes, nextDueDate

---

### 8. Invoices

```
Frontend                      → API Endpoint              → DB Tables
─────────────────────────────────────────────────────────────────────────────────────────
List Invoices                 → GET /invoices              invoices + invoice_items + deliveries
Get Invoice                   → GET /invoices/:id          invoices + items + delivery
Upload Invoice (single)       → POST /invoices/upload      invoices → [background OCR]
Upload Invoices (bulk)        → POST /invoices/bulk-upload invoices → [background OCR]
Confirm Invoice               → PATCH /invoices/:id/confirm invoices
Excel Import                  → POST /invoices/excel-import invoices + customers + deliveries
```

**OCR Processing (BullMQ queue `invoice-processing`):**
1. File saved to `uploads/` directory
2. Invoice record created (status=PENDING)
3. Background worker parses file:
   - PDF → pdf-parse
   - DOCX → mammoth
   - XLSX → xlsx
   - Image → Tesseract.js OCR
4. Extracts: invoiceNumber, vendorName, issueDate, totalAmount, materialType, quantity, address
5. Finds/creates Customer + creates Delivery
6. Updates Invoice (status=PROCESSED, linked to delivery)

---

### 9. Maps & Geofencing (PostGIS)

```
Frontend                      → API Endpoint        → DB Tables
───────────────────────────────────────────────────────────────────
List Zones                    → GET /maps/zones      zones
Create Zone                   → POST /maps/zones     zones
Delete Zone                   → DELETE /maps/zones/:id zones
```

**Geofence Checking (Real-time via Socket.IO):**
```
Driver sends location → TrackingGateway → GeoService
  → PostGIS: ST_Contains(geofence.polygon, ST_MakePoint(lng, lat))
  → If match → emit 'geofenceAlert' to dispatchers room
```

---

### 10. Real-Time Tracking (Socket.IO)

```
Driver App                    → Socket Event              → Dispatcher App
────────────────────────────────────────────────────────────────────────────────────
connect(token)                → (WebSocket handshake)     → joinDispatchers
updateLocation(id,lat,lng...) → 'updateLocation'           → 'driverLocationUpdated'
                                                           → 'driverStatusChanged'
                                                           → 'geofenceAlert'
```

**Server-side processing per location update:**
1. Register driver in `activeDrivers` Map (driverId → socketId)
2. Emit `driverStatusChanged` if newly online
3. Update `Driver.isOnline = true`, `Driver.lastSeen = now()` in DB
4. Enqueue `location-tracking` to BullMQ for async persistence
5. Broadcast `locationUpdated` to `delivery_{id}` room
6. Broadcast `driverLocationUpdated` to `dispatchers` room
7. Check geofence alerts via PostGIS `ST_Contains`

**Ghost Connection Cleanup:** Every 30 seconds, disconnect stale sockets.

---

### 11. Proof of Delivery (POD)

```
Driver App                    → API Endpoint          → DB Table
─────────────────────────────────────────────────────────────────────────
Capture Photo + Signature     → POST /pod/:deliveryId deliveries
                              → PATCH /deliveries/:id/proof deliveries
```

**Updated fields:** proof_image_url, signature_url, pod_latitude, pod_longitude, pod_timestamp, status=DELIVERED, completedAt=now()

---

### 12. Notifications

```
Frontend                      → API Endpoint                → DB Table
───────────────────────────────────────────────────────────────────────────────────
List Notifications (20)       → GET /notifications           notifications
Mark One Read                 → PATCH /notifications/:id/read notifications
Mark All Read                 → PATCH /notifications/read-all notifications
```

**System-triggered notifications (backend):**
- Route deviation alert → `alertRouteDeviation(driverName, deliveryNumber)`
- Stopped vehicle alert → `alertStoppedVehicle(driverName, durationMinutes)`
- Delayed trip alert → `alertDelayedTrip(deliveryNumber, expectedTime)`

**WhatsApp Notifications (BullMQ queue `whatsapp-events`):**
- `delivery_assigned` → customer notified of delivery assignment
- `driver_departed` → customer receives tracking URL
- `eta_update` → customer notified of ETA changes
- `delivery_completed` → customer notified of delivery completion

---

### 13. Reports & Analytics

```
Frontend                      → API Endpoint                   → Cache → DB Tables
─────────────────────────────────────────────────────────────────────────────────────────
Daily Report (date)           → GET /reports/daily?date=       60s     deliveries
Driver Performance            → GET /reports/drivers           30s     drivers + deliveries
Vehicle Utilization            → GET /reports/vehicles         30s     vehicles + deliveries
Delayed Deliveries            → GET /reports/delayed           30s     deliveries
Weekly Stats                  → GET /reports/weekly-stats      5min    deliveries
Executive Dashboard           → GET /reports/executive         30s     deliveries + drivers + vehicles
Global Performance            → GET /analytics/performance     none    deliveries
Driver Leaderboard            → GET /analytics/leaderboard     none    drivers + deliveries
```

**All report endpoints cached** with configurable TTL (30s to 5min).

---

### 14. System Settings

```
Frontend                      → API Endpoint          → DB Table
─────────────────────────────────────────────────────────────────
Get All Settings              → GET /settings          system_settings
Update Setting                → PUT /settings/:key     system_settings (upsert)
```

**Stored as key-value pairs with JSONB values.**

---

### 15. Users Management

```
Frontend                      → API Endpoint          → DB Table
─────────────────────────────────────────────────────────────────
List Users                    → GET /users            users + roles + permissions
Create User                   → POST /users           users
Update User                   → PATCH /users/:id      users
Delete User                   → DELETE /users/:id     users
List Roles                    → GET /roles            roles
Get Role                      → GET /roles/:id        roles + permissions
List Permissions              → GET /permissions      permissions
```

---

### 16. Activity Logging (Cross-cutting)

```
Any API Call (non-GET)        → Global Interceptor           → DB Table
─────────────────────────────────────────────────────────────────────────────
ActivityLoggerInterceptor     → Logs userId, action, entity, details, ip → activity_logs
AuditLogEntry (data changes)  → Logs oldValues, newValues                 → audit_log_entries
```

---

## Complete API Endpoint Summary

| HTTP | Endpoint | Auth | Rate Limit | Cache |
|------|----------|------|-----------|-------|
| POST | `/auth/login` | Public | 100/60s | No |
| POST | `/auth/logout` | JWT | 100/60s | No |
| POST | `/auth/refresh` | RefreshToken | 100/60s | No |
| POST | `/auth/change-password` | JWT | 100/60s | No |
| POST | `/auth/register` | Public | 100/60s | No |
| GET | `/users` | JWT+Admin | 100/60s | No |
| POST | `/users` | JWT+Admin | 100/60s | No |
| PATCH | `/users/:id` | JWT+Admin | 100/60s | No |
| DELETE | `/users/:id` | JWT+Admin | 100/60s | No |
| GET | `/roles` | JWT+Admin | 100/60s | No |
| GET | `/permissions` | JWT+Admin | 100/60s | No |
| GET | `/customers` | JWT+Ops | 100/60s | No |
| POST | `/customers` | JWT+Ops | 100/60s | No |
| GET | `/deliveries` | JWT+Ops | 100/60s | No |
| PATCH | `/deliveries/:id/status` | JWT+Ops | 100/60s | No |
| POST | `/deliveries/:id/smart-assign` | JWT+Ops | 100/60s | No |
| POST | `/deliveries/:id/calculate-costs` | JWT+Ops | 100/60s | No |
| GET | `/dispatch` | JWT+Ops | 100/60s | Yes (60s) |
| POST | `/dispatch` | JWT+Ops | 100/60s | No |
| PATCH | `/dispatch/:id/assign` | JWT+Ops | 100/60s | No |
| GET | `/drivers` | JWT+Ops | 100/60s | No |
| POST | `/drivers` | JWT+Ops | 100/60s | No |
| GET | `/vehicles` | JWT+Ops | 100/60s | No |
| POST | `/vehicles` | JWT+Ops | 100/60s | No |
| GET | `/fuel-logs` | JWT | 100/60s | No |
| POST | `/fuel-logs` | JWT | 100/60s | No |
| GET | `/maintenance-logs` | JWT | 100/60s | No |
| POST | `/maintenance-logs` | JWT | 100/60s | No |
| GET | `/invoices` | Public | 100/60s | No |
| POST | `/invoices/upload` | Public | 100/60s | No |
| PATCH | `/invoices/:id/confirm` | Public | 100/60s | No |
| POST | `/invoices/excel-import` | Public | 100/60s | No |
| GET | `/maps/zones` | JWT+Ops | 100/60s | No |
| POST | `/maps/zones` | JWT+Ops | 100/60s | No |
| GET | `/reports/daily` | JWT+Ops | 100/60s | Yes (60s) |
| GET | `/reports/drivers` | JWT+Ops | 100/60s | Yes (30s) |
| GET | `/reports/vehicles` | JWT+Ops | 100/60s | Yes (30s) |
| GET | `/reports/delayed` | JWT+Ops | 100/60s | Yes (30s) |
| GET | `/reports/executive` | JWT+Ops | 100/60s | Yes (30s) |
| GET | `/reports/weekly-stats` | JWT+Ops | 100/60s | Yes (5min) |
| GET | `/analytics/performance` | JWT+Ops | 100/60s | No |
| GET | `/analytics/leaderboard` | JWT+Ops | 100/60s | No |
| GET | `/notifications` | JWT+All | 100/60s | No |
| PATCH | `/notifications/:id/read` | JWT+All | 100/60s | No |
| PATCH | `/notifications/read-all` | JWT+All | 100/60s | No |
| POST | `/pod/:deliveryId` | JWT | 100/60s | No |
| GET | `/settings` | JWT+Admin | 100/60s | No |
| PUT | `/settings/:key` | JWT+Admin | 100/60s | No |

## Socket.IO Events

| Direction | Event | Payload |
|-----------|-------|---------|
| C→S | `updateLocation` | `{ deliveryId, lat, lng, driverId, speed?, heading?, batteryLevel? }` |
| C→S | `joinDelivery` | `deliveryId: string` |
| C→S | `joinDispatchers` | *(none)* |
| S→C | `locationUpdated` | Location object (to delivery room) |
| S→C | `driverLocationUpdated` | Location object (to dispatchers room) |
| S→C | `driverStatusChanged` | `{ driverId, status: "online"|"offline" }` |
| S→C | `geofenceAlert` | `{ driverId, alerts: Geofence[], timestamp }` |

## BullMQ Queues (Redis)

| Queue | Purpose | Consumer |
|-------|---------|----------|
| `invoice-processing` | OCR file processing | InvoiceProcessor |
| `location-tracking` | Async GPS persistence | LocationPing saver |
| `whatsapp-events` | Send WhatsApp messages | WhatsApp sender |
| `notifications` | General notification dispatch | Notification dispatcher |
| `report-generation` | Heavy report generation | Report generator |
| `cleanup-jobs` | Periodic cleanup | Session cleanup |

## Database Entity Relationship Summary

```
users ──< role_permissions >── permissions
  │
  ├──< drivers (user_id)
  │     └──┐
  ├──< orders (dispatcher_id)  ──< deliveries (order_id)
  │                               ├──< delivery_tracking
  │                               ├──< delivery_status_logs
  │                               ├──< delivery_helpers >── drivers
  │                               ├──< loading_verifications
  │                               └──< invoices ──< invoice_items
  │
  ├──< customers ──< deliveries (customer_id)
  ├──< vehicles ──< deliveries (vehicle_id)
  │              ├──< drivers (vehicle_id)
  │              ├──< fuel_logs
  │              └──< maintenance_logs
  ├──< notifications
  ├──< activity_logs
  └──< audit_log_entries

zones (PostGIS polygons)
geofences (PostGIS polygons)
location_pings (GPS history)
whatsapp_messages
system_settings
analytics_snapshots
```
