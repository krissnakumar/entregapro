import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import Overview from '../components/Overview';
import CustomersList from '../components/CustomersList';
import DriversList from '../components/DriversList';
import VehiclesList from '../components/VehiclesList';
import UserManagement from '../components/UserManagement';
import ReportsPage from './Reports';
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

const AdminDashboard = () => {
  return (
    <AppLayout>
      <Routes>
        <Route path="" element={<Overview />} />
        <Route path="analytics" element={<Overview />} />
        <Route path="orders" element={<OrdersList />} />
        <Route path="dispatch" element={<DispatchCommandCenter />} />
        <Route path="tracking" element={<MapView />} />
        <Route path="routes" element={<MapView />} />
        <Route path="customers" element={<CustomersList />} />
        <Route path="drivers" element={<DriversList />} />
        <Route path="vehicles" element={<VehiclesList />} />
        <Route path="deliveries" element={<DeliveriesManagement />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="roles" element={<UserManagement />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="nfe" element={<NfePage />} />
        <Route path="plan" element={<PlanPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="fuel" element={<FuelMaintenanceModule />} />
        <Route path="maintenance" element={<FuelMaintenanceModule />} />
        <Route path="loading" element={<LoadingVerificationScreen />} />
        <Route path="billing" element={<ExcelBillingImportScreen />} />
        <Route path="pod" element={<InvoicesPage />} />
        <Route path="materials" element={<div className="p-8 text-center text-slate-500"><p className="text-lg font-semibold">Módulo de Materiais</p><p className="text-sm mt-1">Em breve</p></div>} />
        <Route path="capacity" element={<div className="p-8 text-center text-slate-500"><p className="text-lg font-semibold">Capacidade de Carga</p><p className="text-sm mt-1">Em breve</p></div>} />
        <Route path="jobsites" element={<JobSitesPage />} />
      </Routes>
    </AppLayout>
  );
};

export default AdminDashboard;
