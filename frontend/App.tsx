import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { TenantProvider } from './src/contexts/TenantContext';
import { ModuleProvider } from './src/contexts/ModuleContext';
import { CartProvider } from './src/contexts/CartContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { ChatProvider } from './src/contexts/ChatContext';
import { BluetoothProvider } from './src/contexts/BluetoothContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <TenantProvider>
          <ModuleProvider>
            <BluetoothProvider>
              <CartProvider>
                <NotificationProvider>
                  <ChatProvider>
                    <AppNavigator />
                    <StatusBar style="auto" />
                  </ChatProvider>
                </NotificationProvider>
              </CartProvider>
            </BluetoothProvider>
          </ModuleProvider>
        </TenantProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
