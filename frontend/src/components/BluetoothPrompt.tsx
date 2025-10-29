import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBluetoothContext } from '../contexts/BluetoothContext';

interface BluetoothPromptProps {
  visible: boolean;
  onClose?: () => void;
  onRequestPermission?: () => void;
}

export default function BluetoothPrompt({
  visible,
  onClose,
  onRequestPermission,
}: BluetoothPromptProps) {
  const {
    isBluetoothEnabled,
    isBluetoothSupported,
    hasBluetoothPermission,
    isChecking,
    requestBluetoothPermission,
    openBluetoothSettings,
    checkBluetoothStatus,
  } = useBluetoothContext();

  const handleRequestPermission = async () => {
    const granted = await requestBluetoothPermission();
    if (granted) {
      await checkBluetoothStatus();
      if (onRequestPermission) {
        onRequestPermission();
      }
    }
  };

  const handleOpenSettings = () => {
    openBluetoothSettings();
  };

  const renderContent = () => {
    if (isChecking) {
      return (
        <View style={styles.contentContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.title}>Sjekker Bluetooth-status...</Text>
        </View>
      );
    }

    if (!isBluetoothSupported) {
      return (
        <View style={styles.contentContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="warning" size={64} color="#DC2626" />
          </View>
          <Text style={styles.title}>Bluetooth støttes ikke</Text>
          <Text style={styles.description}>
            Enheten din støtter ikke Bluetooth. Du kan ikke bruke nærhetsbasert dørlåsing.
          </Text>
          {onClose && (
            <TouchableOpacity style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>Lukk</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (!hasBluetoothPermission) {
      return (
        <View style={styles.contentContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="bluetooth" size={64} color="#3B82F6" />
            <View style={styles.warningBadge}>
              <Ionicons name="warning" size={24} color="#DC2626" />
            </View>
          </View>
          <Text style={styles.title}>Bluetooth-tilgang kreves</Text>
          <Text style={styles.description}>
            ObliKey trenger tilgang til Bluetooth for å låse opp dører ved hjelp av nærhetsdetektor.
          </Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.featureText}>Låse opp dører automatisk når du er i nærheten</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.featureText}>Sikker kommunikasjon med dørlåser</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.featureText}>Sømløs adgangskontroll</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={handleRequestPermission}
          >
            <Ionicons name="bluetooth" size={20} color="#FFF" />
            <Text style={styles.buttonText}>Gi Bluetooth-tilgang</Text>
          </TouchableOpacity>
          {onClose && (
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>Kanskje senere</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (!isBluetoothEnabled) {
      return (
        <View style={styles.contentContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="bluetooth" size={64} color="#9CA3AF" />
            <View style={styles.warningBadge}>
              <Ionicons name="close" size={24} color="#DC2626" />
            </View>
          </View>
          <Text style={styles.title}>Bluetooth er av</Text>
          <Text style={styles.description}>
            Vennligst slå på Bluetooth for å bruke nærhetsbasert dørlåsing.
          </Text>
          <View style={styles.stepsContainer}>
            <Text style={styles.stepsTitle}>Slik slår du på Bluetooth:</Text>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>Åpne enhetens innstillinger</Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>Finn og trykk på Bluetooth</Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>Slå på Bluetooth</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={handleOpenSettings}
          >
            <Ionicons name="settings" size={20} color="#FFF" />
            <Text style={styles.buttonText}>Åpne innstillinger</Text>
          </TouchableOpacity>
          {onClose && (
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>Lukk</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    // Bluetooth is enabled and has permission
    return (
      <View style={styles.contentContainer}>
        <View style={styles.iconContainer}>
          <Ionicons name="bluetooth" size={64} color="#10B981" />
          <View style={styles.successBadge}>
            <Ionicons name="checkmark" size={24} color="#FFF" />
          </View>
        </View>
        <Text style={styles.title}>Bluetooth er aktivt</Text>
        <Text style={styles.description}>
          Du kan nå bruke nærhetsbasert dørlåsing!
        </Text>
        {onClose && (
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Fortsett</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {renderContent()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  contentContainer: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  warningBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 2,
  },
  successBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#10B981',
    borderRadius: 16,
    padding: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  featureList: {
    width: '100%',
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  stepsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  stepText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
});
