import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import DriverHomeScreen from '../screens/DriverHomeScreen';
import DeliveryDetailScreen from '../screens/DeliveryDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();

export const driverScreens = {
  Login: LoginScreen,
  DriverHome: DriverHomeScreen,
  DeliveryDetail: DeliveryDetailScreen,
  Profile: ProfileScreen,
} as const;

export type DriverStackParamList = {
  Login: undefined;
  DriverHome: undefined;
  DeliveryDetail: { deliveryId?: string } | undefined;
  Profile: undefined;
};

export default Stack;
