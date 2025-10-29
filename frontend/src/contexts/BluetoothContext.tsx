import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import * as Device from 'expo-device';

interface BluetoothContextType {
  isBluetoothEnabled: boolean;
  isBluetoothSupported: boolean;
  hasBluetoothPermission: boolean;
  isChecking: boolean;
  checkBluetoothStatus: () => Promise<void>;
  requestBluetoothPermission: () => Promise<boolean>;
  openBluetoothSettings: () => void;
}

const BluetoothContext = createContext<BluetoothContextType | undefined>(undefined);

export const useBluetoothContext = () => {
  const context = useContext(BluetoothContext);
  if (!context) {
    throw new Error('useBluetoothContext must be used within a BluetoothProvider');
  }
  return context;
};

interface BluetoothProviderProps {
  children: ReactNode;
}

export const BluetoothProvider: React.FC<BluetoothProviderProps> = ({ children }) => {
  const [bleManager] = useState(() => {
    try {
      return new BleManager();
    } catch (error) {
      console.log('BleManager not available - running in Expo Go or simulator');
      return null;
    }
  });
  const [isBluetoothEnabled, setIsBluetoothEnabled] = useState(false);
  const [isBluetoothSupported, setIsBluetoothSupported] = useState(!!bleManager);
  const [hasBluetoothPermission, setHasBluetoothPermission] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Request Bluetooth permissions for Android
  const requestAndroidBluetoothPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      // Android 12+ (API 31+) requires specific Bluetooth permissions
      if (Platform.Version >= 31) {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        return (
          granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        // Android 11 and below - only need location permission for BLE
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );

        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('Error requesting Bluetooth permissions:', error);
      return false;
    }
  };

  // Check if device has Bluetooth permissions
  const checkAndroidBluetoothPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      if (Platform.Version >= 31) {
        const scanPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
        );
        const connectPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
        );
        const locationPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );

        return scanPermission && connectPermission && locationPermission;
      } else {
        // Android 11 and below - only need location permission for BLE
        const locationPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );

        return locationPermission;
      }
    } catch (error) {
      console.error('Error checking Bluetooth permissions:', error);
      return false;
    }
  };

  // Request Bluetooth permission
  const requestBluetoothPermission = async (): Promise<boolean> => {
    try {
      if (!bleManager) {
        console.log('BleManager not available - cannot request Bluetooth permission');
        return false;
      }

      if (Platform.OS === 'android') {
        const granted = await requestAndroidBluetoothPermissions();
        setHasBluetoothPermission(granted);
        return granted;
      } else if (Platform.OS === 'ios') {
        // iOS permissions are handled automatically when BLE is accessed
        // Check Bluetooth state to trigger permission prompt
        const state = await bleManager.state();
        const hasPermission = state !== 'Unauthorized';
        setHasBluetoothPermission(hasPermission);
        return hasPermission;
      }
      return true;
    } catch (error) {
      console.error('Error requesting Bluetooth permission:', error);
      return false;
    }
  };

  // Check Bluetooth status
  const checkBluetoothStatus = async () => {
    try {
      setIsChecking(true);

      if (!bleManager) {
        console.log('BleManager not available - skipping Bluetooth status check');
        setIsBluetoothSupported(false);
        setIsBluetoothEnabled(false);
        setHasBluetoothPermission(false);
        setIsChecking(false);
        return;
      }

      // Check if device supports Bluetooth
      const deviceType = await Device.getDeviceTypeAsync();
      const supported = deviceType !== Device.DeviceType.UNKNOWN;
      setIsBluetoothSupported(supported);

      if (!supported) {
        setIsChecking(false);
        return;
      }

      // Check permissions first
      let hasPermission = false;
      if (Platform.OS === 'android') {
        hasPermission = await checkAndroidBluetoothPermissions();
      } else if (Platform.OS === 'ios') {
        const state = await bleManager.state();
        hasPermission = state !== 'Unauthorized';
      } else {
        hasPermission = true; // Web or other platforms
      }

      setHasBluetoothPermission(hasPermission);

      // Check if Bluetooth is enabled
      if (hasPermission) {
        const state = await bleManager.state();
        const enabled = state === 'PoweredOn';
        setIsBluetoothEnabled(enabled);
      } else {
        setIsBluetoothEnabled(false);
      }
    } catch (error) {
      console.error('Error checking Bluetooth status:', error);
      setIsBluetoothEnabled(false);
      setHasBluetoothPermission(false);
    } finally {
      setIsChecking(false);
    }
  };

  // Open Bluetooth settings
  const openBluetoothSettings = () => {
    if (Platform.OS === 'ios') {
      Alert.alert(
        'Aktiver Bluetooth',
        'Vennligst aktiver Bluetooth i iOS-innstillingene for å bruke denne funksjonen.',
        [
          { text: 'Avbryt', style: 'cancel' },
          { text: 'Åpne innstillinger', onPress: () => Linking.openSettings() },
        ]
      );
    } else if (Platform.OS === 'android') {
      // On Android, we can try to open Bluetooth settings directly
      Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS').catch(() => {
        Alert.alert(
          'Aktiver Bluetooth',
          'Vennligst aktiver Bluetooth i enhetens innstillinger for å bruke denne funksjonen.',
          [
            { text: 'Avbryt', style: 'cancel' },
            { text: 'Åpne innstillinger', onPress: () => Linking.openSettings() },
          ]
        );
      });
    }
  };

  // Monitor Bluetooth state changes
  useEffect(() => {
    if (!bleManager) {
      console.log('BleManager not available - skipping state change monitoring');
      // Still perform initial check to set default values
      checkBluetoothStatus();
      return;
    }

    const subscription = bleManager.onStateChange((state) => {
      const enabled = state === 'PoweredOn';
      setIsBluetoothEnabled(enabled);

      // Re-check permissions when state changes
      if (Platform.OS === 'android') {
        checkAndroidBluetoothPermissions().then(setHasBluetoothPermission);
      } else if (Platform.OS === 'ios') {
        const hasPermission = state !== 'Unauthorized';
        setHasBluetoothPermission(hasPermission);
      }
    }, true);

    // Initial check
    checkBluetoothStatus();

    return () => {
      subscription.remove();
    };
  }, []);

  const value: BluetoothContextType = {
    isBluetoothEnabled,
    isBluetoothSupported,
    hasBluetoothPermission,
    isChecking,
    checkBluetoothStatus,
    requestBluetoothPermission,
    openBluetoothSettings,
  };

  return <BluetoothContext.Provider value={value}>{children}</BluetoothContext.Provider>;
};
