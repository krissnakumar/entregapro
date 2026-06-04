import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminLoginScreen from '../screens/AdminLoginScreen';
import AdminHomeScreen from '../screens/AdminHomeScreen';
import CustomersScreen from '../screens/CustomersScreen';
import DriversScreen from '../screens/DriversScreen';
import VehiclesScreen from '../screens/VehiclesScreen';
import DeliveriesScreen from '../screens/DeliveriesScreen';
import InvoicesScreen from '../screens/InvoicesScreen';
import UsersManagementScreen from '../screens/UsersManagementScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export const adminScreens = {
  Login: AdminLoginScreen,
  AdminHome: AdminHomeScreen,
  Customers: CustomersScreen,
  Drivers: DriversScreen,
  Vehicles: VehiclesScreen,
  Deliveries: DeliveriesScreen,
  Invoices: InvoicesScreen,
  UsersManagement: UsersManagementScreen,
  Settings: SettingsScreen,
} as const;

export type AdminStackParamList = {
  Login: undefined;
  AdminHome: undefined;
  Customers: undefined;
  Drivers: undefined;
  Vehicles: undefined;
  Deliveries: undefined;
  Invoices: undefined;
  UsersManagement: undefined;
  Settings: undefined;
};

export default Stack;
