import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/useAuthStore';
import { ThemeProvider } from './store/ThemeProvider';
import { Toaster } from 'sonner';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import PublicTracking from './pages/PublicTracking';
import AdminDashboard from './pages/AdminDashboard';
import DispatcherDashboard from './pages/DispatcherDashboard';
import DriverDashboard from './pages/DriverDashboard';
import { Role } from './types';

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, token } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const DashboardRouter = () => {
  const { user } = useAuthStore();

  // Determine which dashboard to show based on user role
  if (!user) return <Navigate to="/login" replace />;

  // Driver role goes to driver dashboard exclusively
  if (user.role === Role.DRIVER || user.role === Role.HELPER) {
    return <DriverDashboard />;
  }

  // Dispatcher role
  if (user.role === Role.DISPATCHER) {
    return <DispatcherDashboard />;
  }

  // Admin, Super Admin, Accountant, and all other admin roles
  return <AdminDashboard />;
};

const AppRoutes = () => {
  const { user } = useAuthStore();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/tracking/:id" element={<PublicTracking />} />
      
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <DashboardRouter />
          </ProtectedRoute>
        }
      />
      
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="entregapro-ui-theme">
      <QueryClientProvider client={queryClient}>
        <Router>
          <AppRoutes />
        </Router>
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
