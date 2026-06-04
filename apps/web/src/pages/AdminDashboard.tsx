import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket, useRealtimeNotifications } from '../hooks/useSocket';
import { toast } from 'sonner';
import { AppLayout } from '../components/layout/AppLayout';
import Overview from '../components/Overview';
import CustomersList from '../components/CustomersList';
import DriversList from '../components/DriversList';
import VehiclesList from '../components/VehiclesList';
import UserManagement from '../components/UserManagement';
import { ReportsPage } from './Reports';
import { RolesPage } from './RolesPage';
import DeliveriesManagement from './DeliveriesManagement';
import ProfilePage from './Profile';
import SettingsPage from './Settings';
import InvoicesPage from './Invoices';
import { PlanPage } from './subscription/PlanPage';
import { JobSitesPage } from './JobSitesPage';
import { NfePage } from './NfePage';
import { LoadingVerificationScreen } from '../components/LoadingVerificationScreen';
import { FuelMaintenanceModule } from '../components/FuelMaintenanceModule';
import { ExcelBillingImportScreen } from '../components/ExcelBillingImportScreen';
import DispatchBoard from '../components/DispatchBoard';
import OrdersList from '../components/OrdersList';
import MapView from '../components/MapView';
import { DispatchCommandCenter } from '../components/dispatch/DispatchCommandCenter';
import { DispatchAssignmentPanel } from '../components/dispatch/DispatchAssignmentPanel';
import { FuelApprovalQueue } from '../components/dispatch/FuelApprovalQueue';
import { DeliveryCreationForm } from '../components/admin/DeliveryCreationForm';
import { ExcelUploadComponent } from '../components/admin/ExcelUploadComponent';
import RoutePlanner from './RoutePlanner';
import { MaintenancePage } from './MaintenancePage';
import { MaterialsPage } from './MaterialsPage';
import { LoadCapacityPage } from './LoadCapacityPage';

const AdminDashboard = () => {
  const queryClient = useQueryClient();
  const { socket, getSocket } = useSocket();

  // Real-time Socket.IO listeners
  useEffect(() => {
    const s = socket || getSocket();
    if (!s) return;

    const onDeliveryCreated = () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['dispatcher-deliveries'] });
    };

    const onDeliveryStatusChanged = () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['dispatcher-deliveries'] });
    };

    const onFuelRequestCreated = () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-requests'] });
    };

    s.on('deliveryCreated', onDeliveryCreated);
    s.on('deliveryStatusChanged', onDeliveryStatusChanged);
    s.on('deliveryAssigned', onDeliveryCreated);
    s.on('fuelRequestCreated', onFuelRequestCreated);
    s.on('fuelRequestUpdated', onFuelRequestCreated);

    return () => {
      s.off('deliveryCreated', onDeliveryCreated);
      s.off('deliveryStatusChanged', onDeliveryStatusChanged);
      s.off('deliveryAssigned', onDeliveryCreated);
      s.off('fuelRequestCreated', onFuelRequestCreated);
      s.off('fuelRequestUpdated', onFuelRequestCreated);
    };
  }, [socket, getSocket, queryClient]);

  useRealtimeNotifications((notification) => {
    if (notification.type?.includes('DELIVERY') || notification.type?.includes('FUEL')) {
      queryClient.invalidateQueries({ queryKey: ['admin-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-requests'] });
    }
  });

  return (
    <AppLayout>
      <Routes>
        <Route path="" element={<Overview />} />
        <Route path="analytics" element={<ReportsPage />} />
        <Route path="orders" element={<OrdersList />} />
        <Route path="dispatch" element={<DispatchCommandCenter />} />
        <Route path="tracking" element={<MapView />} />
        <Route path="routes" element={<RoutePlanner />} />
        <Route path="customers" element={<CustomersList />} />
        <Route path="drivers" element={<DriversList />} />
        <Route path="vehicles" element={<VehiclesList />} />
        <Route path="deliveries" element={<DeliveriesManagement />} />
        <Route path="deliveries/new" element={<AdminDeliveryCreationPage />} />
        <Route path="deliveries/upload" element={<AdminExcelUploadPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="roles" element={<RolesPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="nfe" element={<NfePage />} />
        <Route path="plan" element={<PlanPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="fuel" element={<FuelMaintenanceModule />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="loading" element={<LoadingVerificationScreen />} />
        <Route path="billing" element={<ExcelBillingImportScreen />} />
        <Route path="pod" element={<InvoicesPage />} />
        <Route path="materials" element={<MaterialsPage />} />
        <Route path="capacity" element={<LoadCapacityPage />} />
        <Route path="jobsites" element={<JobSitesPage />} />
      </Routes>
    </AppLayout>
  );
};

export default AdminDashboard;

function AdminDeliveryCreationPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <DeliveryCreationForm />
    </div>
  );
}

function AdminExcelUploadPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <ExcelUploadComponent />
    </div>
  );
}
