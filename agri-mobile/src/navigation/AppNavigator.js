import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';

// Screens
import SplashScreen from '../screens/SplashScreen';
import RoleSelectionScreen from '../screens/RoleSelectionScreen';
import MechanicDashboard from '../screens/mechanic/MechanicDashboard';
import OCRScannerScreen from '../screens/mechanic/OCRScannerScreen';
import QRScanScreen from '../screens/mechanic/QRScanScreen';
import MaintenanceListScreen from '../screens/mechanic/MaintenanceListScreen';
import MechanicMachineDetailScreen from '../screens/mechanic/MachineDetailScreen';
import AIChatbotScreen from '../screens/mechanic/AIChatbotScreen';
import OwnerDashboard from '../screens/owner/OwnerDashboard';
import MachineListScreen from '../screens/owner/MachineListScreen';
import MachineDetailScreen from '../screens/owner/MachineDetailScreen';
import PricePredictionScreen from '../screens/owner/PricePredictionScreen';
import OwnerOCRScannerScreen from '../screens/owner/OCRScannerScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// 정비업체 탭 네비게이션
const MechanicTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'QRScan') {
            iconName = focused ? 'qr-code' : 'qr-code-outline';
          } else if (route.name === 'OCRScanner') {
            iconName = focused ? 'camera' : 'camera-outline';
          } else if (route.name === 'MaintenanceList') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1976D2',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={MechanicDashboard}
        options={{ tabBarLabel: '홈' }}
      />
      <Tab.Screen 
        name="QRScan" 
        component={QRScanScreen}
        options={{ tabBarLabel: 'QR 스캔' }}
      />
      <Tab.Screen 
        name="OCRScanner" 
        component={OCRScannerScreen}
        options={{ tabBarLabel: 'OCR' }}
      />
      <Tab.Screen 
        name="MaintenanceList" 
        component={MaintenanceListScreen}
        options={{ tabBarLabel: '이력' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ tabBarLabel: '설정' }}
      />
    </Tab.Navigator>
  );
};

// 농기계 소유자 탭 네비게이션
const OwnerTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'MachineList') {
            iconName = focused ? 'construct' : 'construct-outline';
          } else if (route.name === 'PricePrediction') {
            iconName = focused ? 'trending-up' : 'trending-up-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2E7D32',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={OwnerDashboard}
        options={{ tabBarLabel: '홈' }}
      />
      <Tab.Screen 
        name="MachineList" 
        component={MachineListScreen}
        options={{ tabBarLabel: '내 농기계' }}
      />
      <Tab.Screen 
        name="PricePrediction" 
        component={PricePredictionScreen}
        options={{ tabBarLabel: 'AI 가격' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ tabBarLabel: '설정' }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { userRole, isLoading } = useApp();
  const [showSplash, setShowSplash] = React.useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!userRole ? (
          <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        ) : userRole === 'mechanic' ? (
          <>
            <Stack.Screen name="MechanicMain" component={MechanicTabs} />
            <Stack.Screen name="MachineDetail" component={MechanicMachineDetailScreen} />
            <Stack.Screen name="OCRScanner" component={OCRScannerScreen} />
            <Stack.Screen name="AIChatbot" component={AIChatbotScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="OwnerMain" component={OwnerTabs} />
            <Stack.Screen name="MachineDetail" component={MachineDetailScreen} />
            <Stack.Screen name="OCRScanner" component={OwnerOCRScannerScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
