import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setTokenProvider, getAuthToken, useRealtimeNotifications } from '@rn-apps/shared';
import { useAuthStore } from '@rn-apps/shared';
import LoginScreen from './src/screens/LoginScreen';
import DriverHomeScreen from './src/screens/DriverHomeScreen';
import DeliveryDetailScreen from './src/screens/DeliveryDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const queryClient = new QueryClient();
const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { user, token } = useAuthStore();
  const isAuthenticated = !!token && !!user;

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
          <Stack.Screen name="DriverHome" component={DriverHomeScreen} />
          <Stack.Screen name="DeliveryDetail" component={DeliveryDetailScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
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
