import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setTokenProvider, getAuthToken, useRealtimeNotifications } from '@rn-apps/shared';
import { useAuthStore } from '@rn-apps/shared';
import DispatcherLoginScreen from './src/screens/DispatcherLoginScreen';
import FleetConsoleScreen from './src/screens/FleetConsoleScreen';
import GpsMonitoringScreen from './src/screens/GpsMonitoringScreen';
import InvoiceInspectionScreen from './src/screens/InvoiceInspectionScreen';
import FuelControlScreen from './src/screens/FuelControlScreen';
import DeliveryDetailScreen from './src/screens/DeliveryDetailScreen';

const queryClient = new QueryClient();
const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { token, user } = useAuthStore();
  const isAuthenticated = !!token;

  // Set up token provider once on component mount
  React.useEffect(() => {
    setTokenProvider(() => getAuthToken());
  }, []);

  // Set up real-time notifications
  useRealtimeNotifications(user?.id);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="FleetConsole" component={FleetConsoleScreen} />
          <Stack.Screen name="DeliveryDetail" component={DeliveryDetailScreen} />
          <Stack.Screen name="GpsMonitoring" component={GpsMonitoringScreen} />
          <Stack.Screen name="InvoiceInspection" component={InvoiceInspectionScreen} />
          <Stack.Screen name="FuelControl" component={FuelControlScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={DispatcherLoginScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <RootNavigator />
        <StatusBar style="dark" />
      </NavigationContainer>
    </QueryClientProvider>
  );
}
