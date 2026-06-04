import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DispatcherLoginScreen from '../screens/DispatcherLoginScreen';
import FleetConsoleScreen from '../screens/FleetConsoleScreen';
import GpsMonitoringScreen from '../screens/GpsMonitoringScreen';
import InvoiceInspectionScreen from '../screens/InvoiceInspectionScreen';
import FuelControlScreen from '../screens/FuelControlScreen';
import DeliveryDetailScreen from '../screens/DeliveryDetailScreen';

const Stack = createNativeStackNavigator();

export const dispatcherScreens = {
  Login: DispatcherLoginScreen,
  FleetConsole: FleetConsoleScreen,
  DeliveryDetail: DeliveryDetailScreen,
  GpsMonitoring: GpsMonitoringScreen,
  InvoiceInspection: InvoiceInspectionScreen,
  FuelControl: FuelControlScreen,
} as const;

export type DispatcherStackParamList = {
  Login: undefined;
  FleetConsole: undefined;
  DeliveryDetail: {
    trip: any;
    delivery: any;
    row: any;
  };
  GpsMonitoring: undefined;
  InvoiceInspection: undefined;
  FuelControl: undefined;
};

export default Stack;
