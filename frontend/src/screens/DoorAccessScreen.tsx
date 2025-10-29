import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useBluetoothContext } from '../contexts/BluetoothContext';
import { api } from '../services/api';
import Container from '../components/Container';
import BluetoothPrompt from '../components/BluetoothPrompt';

interface Door {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  status: string;
  isOnline: boolean;
  metadata?: {
    bluetooth?: {
      enabled: boolean;
      beaconId: string;
      minimumRssi: number;
    };
  };
}

interface MembershipStatus {
  hasActiveMembership: boolean;
  membershipName: string | null;
  expiresAt: string | null;
}

export default function DoorAccessScreen({ navigation }: any) {
  const { user } = useAuth();
  const {
    isBluetoothEnabled,
    hasBluetoothPermission,
    isBluetoothSupported,
    checkBluetoothStatus,
  } = useBluetoothContext();
  const [doors, setDoors] = useState<Door[]>([]);
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unlockingDoorId, setUnlockingDoorId] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [simulatedRSSI, setSimulatedRSSI] = useState(-60);
  const [showBluetoothPrompt, setShowBluetoothPrompt] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [doorsResponse, membershipResponse] = await Promise.all([
        api.getUserAccessibleDoors(),
        api.getMembershipStatus(),
      ]);
      setDoors(doorsResponse.data);
      setMembershipStatus(membershipResponse.data);
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.message || 'Kunne ikke hente data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleUnlockDoor = async (doorId: string, doorName: string, door: Door) => {
    try {
      // Check if door requires Bluetooth and Bluetooth is not ready
      if (door.metadata?.bluetooth?.enabled && !testMode) {
        if (!isBluetoothSupported) {
          Alert.alert(
            'Bluetooth ikke støttet',
            'Enheten din støtter ikke Bluetooth. Du kan ikke låse opp denne døren.'
          );
          return;
        }

        if (!hasBluetoothPermission || !isBluetoothEnabled) {
          setShowBluetoothPrompt(true);
          return;
        }
      }

      setUnlockingDoorId(doorId);

      // Build proximity data if test mode is enabled and door has Bluetooth
      let options;
      if (testMode && door.metadata?.bluetooth?.enabled) {
        options = {
          proximityData: {
            testBeaconId: door.metadata.bluetooth.beaconId,
          },
          testMode: true,
        };
      }

      await api.unlockDoor(doorId, options);
      Alert.alert('Suksess', `${doorName} er låst opp!`);

      // Refresh doors to get updated status
      await fetchData();
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || 'Kunne ikke låse opp dør';
      Alert.alert('Tilgang nektet', message);
    } finally {
      setUnlockingDoorId(null);
    }
  };

  const renderMembershipBanner = () => {
    if (!membershipStatus) return null;

    if (!membershipStatus.hasActiveMembership) {
      return (
        <View style={styles.membershipBanner}>
          <View style={styles.bannerContent}>
            <Ionicons name="warning" size={24} color="#DC2626" />
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>Ingen aktivt medlemskap</Text>
              <Text style={styles.bannerSubtitle}>
                Du trenger et aktivt medlemskap for å få tilgang til dører
              </Text>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.membershipBanner, styles.activeBanner]}>
        <View style={styles.bannerContent}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          <View style={styles.bannerText}>
            <Text style={[styles.bannerTitle, styles.activeTitle]}>
              {membershipStatus.membershipName}
            </Text>
            <Text style={styles.bannerSubtitle}>
              {membershipStatus.expiresAt
                ? `Utløper ${new Date(membershipStatus.expiresAt).toLocaleDateString('no-NO')}`
                : 'Aktivt medlemskap'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderBluetoothBanner = () => {
    // Check if any door has Bluetooth enabled
    const hasBluetoothDoors = doors.some((door) => door.metadata?.bluetooth?.enabled);

    if (!hasBluetoothDoors || testMode) {
      return null;
    }

    if (!isBluetoothSupported) {
      return (
        <View style={[styles.bluetoothBanner, styles.bluetoothWarning]}>
          <View style={styles.bannerContent}>
            <Ionicons name="warning" size={24} color="#DC2626" />
            <View style={styles.bannerText}>
              <Text style={styles.bluetoothBannerTitle}>Bluetooth ikke støttet</Text>
              <Text style={styles.bannerSubtitle}>
                Enheten din støtter ikke Bluetooth
              </Text>
            </View>
          </View>
        </View>
      );
    }

    if (!hasBluetoothPermission || !isBluetoothEnabled) {
      return (
        <TouchableOpacity
          style={[styles.bluetoothBanner, styles.bluetoothWarning]}
          onPress={() => setShowBluetoothPrompt(true)}
        >
          <View style={styles.bannerContent}>
            <Ionicons name="bluetooth" size={24} color="#DC2626" />
            <View style={styles.bannerText}>
              <Text style={styles.bluetoothBannerTitle}>
                {!hasBluetoothPermission ? 'Bluetooth-tilgang kreves' : 'Bluetooth er av'}
              </Text>
              <Text style={styles.bannerSubtitle}>
                Trykk her for å {!hasBluetoothPermission ? 'gi tilgang' : 'aktivere'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#DC2626" />
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <View style={[styles.bluetoothBanner, styles.bluetoothSuccess]}>
        <View style={styles.bannerContent}>
          <Ionicons name="bluetooth" size={24} color="#10B981" />
          <View style={styles.bannerText}>
            <Text style={[styles.bluetoothBannerTitle, styles.bluetoothSuccessText]}>
              Bluetooth aktivt
            </Text>
            <Text style={styles.bannerSubtitle}>
              Nærhetsbasert låsing er klar
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderTestModeToggle = () => (
    <View style={styles.testModeCard}>
      <View style={styles.testModeHeader}>
        <Ionicons name="flask" size={20} color="#3B82F6" />
        <Text style={styles.testModeTitle}>Test-modus (Bluetooth Simulator)</Text>
        <Switch
          value={testMode}
          onValueChange={setTestMode}
          trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
          thumbColor={testMode ? '#3B82F6' : '#F3F4F6'}
        />
      </View>
      {testMode && (
        <View style={styles.testModeInfo}>
          <Text style={styles.testModeDescription}>
            Simulerer Bluetooth proximity for testing uten BLE hardware.
          </Text>
          <Text style={styles.testModeNote}>
            I test-modus sendes beacon-ID til serveren for validering.
          </Text>
        </View>
      )}
    </View>
  );

  const renderDoorItem = ({ item }: { item: Door }) => {
    const isUnlocking = unlockingDoorId === item.id;
    const canUnlock = membershipStatus?.hasActiveMembership && item.isOnline;

    return (
      <View style={styles.doorCard}>
        <View style={styles.doorHeader}>
          <View style={styles.doorInfo}>
            <Ionicons
              name="lock-closed"
              size={28}
              color={item.isOnline ? '#3B82F6' : '#9CA3AF'}
            />
            <View style={styles.doorDetails}>
              <Text style={styles.doorName}>{item.name}</Text>
              {item.location && (
                <Text style={styles.doorLocation}>{item.location}</Text>
              )}
            </View>
          </View>
          <View style={[
            styles.statusBadge,
            item.isOnline ? styles.onlineBadge : styles.offlineBadge
          ]}>
            <Text style={[
              styles.statusText,
              item.isOnline ? styles.onlineText : styles.offlineText
            ]}>
              {item.isOnline ? 'Tilkoblet' : 'Frakoblet'}
            </Text>
          </View>
        </View>

        {item.description && (
          <Text style={styles.doorDescription}>{item.description}</Text>
        )}

        {item.metadata?.bluetooth?.enabled && (
          <View style={styles.bluetoothInfo}>
            <Ionicons name="bluetooth" size={16} color="#3B82F6" />
            <Text style={styles.bluetoothText}>
              Bluetooth-aktiv (Beacon: {item.metadata.bluetooth.beaconId})
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.unlockButton,
            (!canUnlock || isUnlocking) && styles.unlockButtonDisabled,
          ]}
          onPress={() => handleUnlockDoor(item.id, item.name, item)}
          disabled={!canUnlock || isUnlocking}
        >
          {isUnlocking ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Ionicons
                name={testMode && item.metadata?.bluetooth?.enabled ? 'flask' : 'lock-open'}
                size={20}
                color={canUnlock ? '#FFF' : '#9CA3AF'}
              />
              <Text style={[
                styles.unlockButtonText,
                !canUnlock && styles.unlockButtonTextDisabled,
              ]}>
                {testMode && item.metadata?.bluetooth?.enabled ? 'Lås opp (Test)' : 'Lås opp'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="key-outline" size={80} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>Ingen tilgjengelige dører</Text>
      <Text style={styles.emptySubtitle}>
        {membershipStatus?.hasActiveMembership
          ? 'Du har ikke tilgang til noen dører ennå'
          : 'Du trenger et aktivt medlemskap for å få tilgang'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <Container style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dørtilgang</Text>
        <Text style={styles.headerSubtitle}>
          Lås opp dører med ditt medlemskap
        </Text>
      </View>

      {renderMembershipBanner()}
      {renderBluetoothBanner()}
      {renderTestModeToggle()}

      <FlatList
        data={doors}
        renderItem={renderDoorItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#3B82F6']}
          />
        }
        ListEmptyComponent={renderEmpty}
      />

      <BluetoothPrompt
        visible={showBluetoothPrompt}
        onClose={() => setShowBluetoothPrompt(false)}
        onRequestPermission={() => {
          checkBluetoothStatus();
          setShowBluetoothPrompt(false);
        }}
      />
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  membershipBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  activeBanner: {
    backgroundColor: '#D1FAE5',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerText: {
    flex: 1,
    marginLeft: 12,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 2,
  },
  activeTitle: {
    color: '#065F46',
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  doorCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  doorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  doorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  doorDetails: {
    marginLeft: 12,
    flex: 1,
  },
  doorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  doorLocation: {
    fontSize: 14,
    color: '#6B7280',
  },
  doorDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  onlineBadge: {
    backgroundColor: '#DBEAFE',
  },
  offlineBadge: {
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  onlineText: {
    color: '#1E40AF',
  },
  offlineText: {
    color: '#6B7280',
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  unlockButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  unlockButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  unlockButtonTextDisabled: {
    color: '#9CA3AF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  testModeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#DBEAFE',
  },
  testModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  testModeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    flex: 1,
    marginLeft: 8,
  },
  testModeInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  testModeDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  testModeNote: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  bluetoothInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  bluetoothText: {
    fontSize: 12,
    color: '#1E40AF',
    marginLeft: 6,
    flex: 1,
  },
  bluetoothBanner: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  bluetoothWarning: {
    backgroundColor: '#FEE2E2',
  },
  bluetoothSuccess: {
    backgroundColor: '#D1FAE5',
  },
  bluetoothBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 2,
  },
  bluetoothSuccessText: {
    color: '#065F46',
  },
});
