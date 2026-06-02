import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/useAuthStore';
import { ThemeProvider } from './store/ThemeProvider';
import { Toaster } from 'sonner';
import { Role } from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageLoader } from './components/LoadingSkeleton';

const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const PublicTracking = lazy(() => import('./pages/PublicTracking'));
const CustomerTracking = lazy(() => import('./pages/CustomerTracking'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const DispatcherDashboard = lazy(() => import('./pages/DispatcherDashboard'));
const DriverDashboard = lazy(() => import('./pages/DriverDashboard'));

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
      <Route path="/login" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Login /></Suspense></ErrorBoundary>} />
      <Route path="/forgot-password" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><ForgotPassword /></Suspense></ErrorBoundary>} />
      <Route path="/tracking/:id" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><PublicTracking /></Suspense></ErrorBoundary>} />
      <Route path="/track/:token" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><CustomerTracking /></Suspense></ErrorBoundary>} />
      
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <DashboardRouter />
              </Suspense>
            </ErrorBoundary>
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
