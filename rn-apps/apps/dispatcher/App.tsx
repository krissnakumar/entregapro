import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setTokenProvider, getAuthToken } from '@rn-apps/shared';
import { useAuthStore } from '@rn-apps/shared';
import DispatcherLoginScreen from './src/screens/DispatcherLoginScreen';
import FleetConsoleScreen from './src/screens/FleetConsoleScreen';
import GpsMonitoringScreen from './src/screens/GpsMonitoringScreen';
import InvoiceInspectionScreen from './src/screens/InvoiceInspectionScreen';

const queryClient = new QueryClient();
const Stack = createNativeStackNavigator();

setTokenProvider(() => getAuthToken());

function RootNavigator() {
  const { token } = useAuthStore();
  const isAuthenticated = !!token;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="FleetConsole" component={FleetConsoleScreen} />
          <Stack.Screen name="GpsMonitoring" component={GpsMonitoringScreen} />
          <Stack.Screen name="InvoiceInspection" component={InvoiceInspectionScreen} />
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
