import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setTokenProvider, getAuthToken } from '@rn-apps/shared';
import { useAuthStore } from '@rn-apps/shared';
import AdminLoginScreen from './src/screens/AdminLoginScreen';
import AdminHomeScreen from './src/screens/AdminHomeScreen';
import CustomersScreen from './src/screens/CustomersScreen';
import DriversScreen from './src/screens/DriversScreen';
import VehiclesScreen from './src/screens/VehiclesScreen';
import DeliveriesScreen from './src/screens/DeliveriesScreen';
import InvoicesScreen from './src/screens/InvoicesScreen';
import UsersManagementScreen from './src/screens/UsersManagementScreen';
import SettingsScreen from './src/screens/SettingsScreen';

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
          <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
          <Stack.Screen name="Customers" component={CustomersScreen} />
          <Stack.Screen name="Drivers" component={DriversScreen} />
          <Stack.Screen name="Vehicles" component={VehiclesScreen} />
          <Stack.Screen name="Deliveries" component={DeliveriesScreen} />
          <Stack.Screen name="Invoices" component={InvoicesScreen} />
          <Stack.Screen name="UsersManagement" component={UsersManagementScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={AdminLoginScreen} />
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
