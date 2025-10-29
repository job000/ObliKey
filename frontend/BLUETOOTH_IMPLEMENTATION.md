# Bluetooth Implementation for ObliKey

This document describes the Bluetooth permission and status checking implementation for the ObliKey React Native Expo app.

## Overview

The Bluetooth implementation provides real-time status checking, permission management, and user-friendly prompts for enabling Bluetooth on both iOS and Android devices. This is essential for the door unlocking feature that uses Bluetooth proximity detection.

## Files Created/Modified

### Created Files

1. **`/src/contexts/BluetoothContext.tsx`**
   - Provides global Bluetooth state management using React Context
   - Monitors Bluetooth status changes in real-time
   - Handles permission requests for both iOS and Android
   - Supports different Android API levels (Android 11 and below vs Android 12+)

2. **`/src/components/BluetoothPrompt.tsx`**
   - Modal component that guides users through enabling Bluetooth
   - Shows different states: checking, not supported, permission needed, disabled, or enabled
   - Provides step-by-step instructions for enabling Bluetooth
   - Includes quick access buttons to open system settings

### Modified Files

1. **`/app.json`**
   - Added iOS Bluetooth permissions (NSBluetoothAlwaysUsageDescription, NSBluetoothPeripheralUsageDescription)
   - Added Android Bluetooth permissions (BLUETOOTH_SCAN, BLUETOOTH_CONNECT, ACCESS_FINE_LOCATION, etc.)

2. **`/App.tsx`**
   - Integrated BluetoothProvider into the app's context hierarchy
   - Makes Bluetooth state available throughout the app

3. **`/src/screens/DoorAccessScreen.tsx`**
   - Integrated Bluetooth status checking
   - Shows Bluetooth status banner when doors have Bluetooth enabled
   - Prompts users to enable Bluetooth before unlocking Bluetooth-enabled doors
   - Blocks door unlocking if Bluetooth requirements are not met (unless in test mode)

4. **`/package.json`**
   - Added dependencies: `expo-device`, `react-native-ble-plx`

## How It Works

### 1. Bluetooth Context

The `BluetoothContext` provides the following features:

- **Real-time monitoring**: Listens for Bluetooth state changes using BLE manager
- **Permission management**: Handles permission requests for both platforms
- **Status checking**: Checks if Bluetooth is supported, has permissions, and is enabled
- **Settings navigation**: Provides functions to open device settings

#### Available State Variables:
```typescript
{
  isBluetoothEnabled: boolean;      // Is Bluetooth currently turned on?
  isBluetoothSupported: boolean;    // Does the device support Bluetooth?
  hasBluetoothPermission: boolean;  // Does the app have Bluetooth permissions?
  isChecking: boolean;              // Is the status check in progress?
}
```

#### Available Methods:
```typescript
{
  checkBluetoothStatus(): Promise<void>;        // Manually check Bluetooth status
  requestBluetoothPermission(): Promise<boolean>; // Request Bluetooth permissions
  openBluetoothSettings(): void;                 // Open device Bluetooth settings
}
```

### 2. Platform-Specific Permissions

#### iOS
- **NSBluetoothAlwaysUsageDescription**: Explains why the app needs Bluetooth access
- **NSBluetoothPeripheralUsageDescription**: For communicating with door locks
- Permissions are requested automatically when Bluetooth is first accessed

#### Android
- **Android 12+ (API 31+)**: Requires BLUETOOTH_SCAN, BLUETOOTH_CONNECT, and ACCESS_FINE_LOCATION
- **Android 11 and below**: Requires ACCESS_FINE_LOCATION (Bluetooth permissions are granted automatically)
- Location permission is required for BLE scanning on all Android versions

### 3. Door Access Integration

The DoorAccessScreen now:

1. **Shows Bluetooth Status Banner**:
   - Red banner if Bluetooth is not supported, permission denied, or disabled
   - Green banner if Bluetooth is ready
   - Hidden when in test mode or no Bluetooth doors exist

2. **Validates Before Unlocking**:
   - Checks if door requires Bluetooth
   - Verifies Bluetooth is supported on the device
   - Ensures permissions are granted
   - Confirms Bluetooth is enabled
   - Shows BluetoothPrompt modal if any requirement is not met

3. **Test Mode**:
   - Allows testing without Bluetooth hardware
   - Bypasses Bluetooth checks when enabled
   - Sends simulated beacon data to the server

### 4. Bluetooth Prompt Modal

The BluetoothPrompt component provides different views based on the Bluetooth state:

- **Checking**: Shows loading indicator while checking status
- **Not Supported**: Informs user their device doesn't support Bluetooth
- **Permission Required**: Explains why Bluetooth is needed and requests permission
- **Bluetooth Disabled**: Provides step-by-step instructions to enable Bluetooth
- **Bluetooth Ready**: Confirms Bluetooth is active and ready to use

## User Experience Flow

### First Time Use (Permission Not Granted)

1. User opens Door Access screen
2. App checks Bluetooth status
3. Red banner appears: "Bluetooth-tilgang kreves"
4. User taps banner or tries to unlock a Bluetooth door
5. BluetoothPrompt modal appears explaining the need for Bluetooth
6. User taps "Gi Bluetooth-tilgang" button
7. System permission dialog appears
8. User grants permission
9. Banner turns green: "Bluetooth aktivt"

### Bluetooth Disabled

1. User has granted permission but Bluetooth is off
2. Red banner appears: "Bluetooth er av"
3. User taps banner
4. BluetoothPrompt modal shows step-by-step instructions
5. User taps "Åpne innstillinger"
6. App opens device Bluetooth settings
7. User enables Bluetooth
8. User returns to app
9. Banner automatically updates to green: "Bluetooth aktivt"

### Normal Operation

1. User has Bluetooth enabled and permissions granted
2. Green banner shows: "Bluetooth aktivt - Nærhetsbasert låsing er klar"
3. User can unlock Bluetooth-enabled doors without any prompts
4. System automatically detects proximity when Bluetooth is active

## Testing

### Test Mode

The app includes a test mode for development and testing without BLE hardware:

1. Enable test mode using the toggle switch
2. When unlocking a Bluetooth door, the app sends simulated beacon data
3. Server validates the beacon ID instead of requiring real proximity
4. Useful for testing the unlock flow without physical Bluetooth beacons

### Testing Bluetooth Integration

To test the Bluetooth implementation:

1. **Test Permission Flow**:
   - Uninstall and reinstall the app
   - Try to unlock a Bluetooth door
   - Verify permission prompt appears
   - Grant permission and verify it works

2. **Test Disabled State**:
   - Disable Bluetooth in device settings
   - Open Door Access screen
   - Verify red banner appears
   - Tap banner and follow instructions
   - Enable Bluetooth and verify banner turns green

3. **Test State Changes**:
   - Start with Bluetooth enabled
   - Disable Bluetooth while app is open
   - Verify banner updates automatically
   - Re-enable Bluetooth
   - Verify banner updates to green

4. **Test Unsupported Device** (if possible):
   - Use an emulator without Bluetooth support
   - Verify appropriate warning message

## Technical Notes

### Dependencies

- **expo-device**: Check device capabilities and type
- **react-native-ble-plx**: Bluetooth Low Energy (BLE) manager for React Native
  - Provides Bluetooth state monitoring
  - Handles BLE communication
  - Works on both iOS and Android

### Android API Level Considerations

The implementation properly handles different Android versions:

- **API 31+ (Android 12+)**: Uses new runtime permissions (BLUETOOTH_SCAN, BLUETOOTH_CONNECT)
- **API 30 and below**: Uses location permission (ACCESS_FINE_LOCATION) for BLE scanning

### iOS Considerations

- Permissions are requested automatically when BLE is first accessed
- NSBluetoothAlwaysUsageDescription is shown to users in the permission dialog
- The app can check Bluetooth state without requesting permission

### State Management

The BluetoothContext uses React hooks and context for efficient state management:

- State updates trigger re-renders only in components using the context
- Bluetooth state listener is set up once when the app starts
- Automatic cleanup prevents memory leaks

## Future Enhancements

Possible improvements for the Bluetooth implementation:

1. **Background Monitoring**: Monitor Bluetooth state even when app is in background
2. **Proximity Detection**: Implement actual proximity detection using RSSI (signal strength)
3. **Auto-unlock**: Automatically unlock doors when in range (if user opts in)
4. **Battery Optimization**: Implement efficient scanning strategies to save battery
5. **Multiple Beacons**: Support scanning for multiple door beacons simultaneously
6. **Signal Strength Display**: Show proximity indicator based on RSSI values

## Troubleshooting

### Common Issues

1. **Permission Denied**:
   - User needs to grant permission in app settings
   - Guide users to Settings > ObliKey > Permissions > Bluetooth

2. **Bluetooth Not Turning On**:
   - Some devices require airplane mode to be off
   - Check if device has Bluetooth hardware

3. **Android 12+ Permission Issues**:
   - Ensure app.json has BLUETOOTH_SCAN and BLUETOOTH_CONNECT
   - Verify targetSdkVersion is set correctly

4. **iOS Permission Not Showing**:
   - Check that infoPlist descriptions are in app.json
   - Rebuild the app after adding permissions

## Summary

The Bluetooth implementation provides a complete solution for:
- Checking Bluetooth availability and status
- Requesting and managing permissions
- Guiding users to enable Bluetooth
- Integrating with the door unlocking feature
- Providing a smooth user experience across iOS and Android

The implementation follows React Native and Expo best practices, handles edge cases, and provides clear user feedback at every step.
