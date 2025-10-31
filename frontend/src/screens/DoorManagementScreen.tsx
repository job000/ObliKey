import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';

interface Door {
  id: string;
  name: string;
  location: string;
  ipAddress: string;
  port: number;
  macAddress?: string;
  description?: string;
  isOnline: boolean;
  lastHeartbeat?: string;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function DoorManagementScreen({ navigation }: any) {
  const [doors, setDoors] = useState<Door[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedDoor, setSelectedDoor] = useState<Door | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    ipAddress: '',
    port: '502',
    macAddress: '',
    description: '',
  });

  useEffect(() => {
    fetchDoors();
  }, []);

  const fetchDoors = async () => {
    try {
      setLoading(true);
      const response = await api.getDoors();
      if (response.success) {
        setDoors(response.data || []);
      }
    } catch (error: any) {
      console.error('Error fetching doors:', error);
      Alert.alert('Feil', 'Kunne ikke hente dører');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDoors();
  };

  const formatMacAddress = (text: string): string => {
    // Remove all non-hex characters
    const cleaned = text.replace(/[^0-9A-Fa-f]/g, '');

    // Split into pairs and join with colons
    const pairs = cleaned.match(/.{1,2}/g) || [];
    return pairs.slice(0, 6).join(':').toUpperCase();
  };

  const handleOpenModal = (door?: Door) => {
    if (door) {
      setEditMode(true);
      setSelectedDoor(door);
      setFormData({
        name: door.name,
        location: door.location,
        ipAddress: door.ipAddress,
        port: door.port.toString(),
        macAddress: door.macAddress || '',
        description: door.description || '',
      });
    } else {
      setEditMode(false);
      setSelectedDoor(null);
      setFormData({
        name: '',
        location: '',
        ipAddress: '',
        port: '502',
        macAddress: '',
        description: '',
      });
    }
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedDoor(null);
    setEditMode(false);
  };

  const handleSaveDoor = async () => {
    if (!formData.name.trim() || !formData.location.trim() || !formData.ipAddress.trim()) {
      Alert.alert('Feil', 'Vennligst fyll ut alle påkrevde felt');
      return;
    }

    try {
      setActionLoading('save');
      const doorData = {
        name: formData.name.trim(),
        location: formData.location.trim(),
        ipAddress: formData.ipAddress.trim(),
        port: parseInt(formData.port) || 502,
        macAddress: formData.macAddress.trim() || undefined,
        description: formData.description.trim() || undefined,
      };

      if (editMode && selectedDoor) {
        await api.updateDoor(selectedDoor.id, doorData);
        Alert.alert('Suksess', 'Dør oppdatert');
      } else {
        await api.createDoor(doorData);
        Alert.alert('Suksess', 'Dør opprettet');
      }

      handleCloseModal();
      fetchDoors();
    } catch (error: any) {
      console.error('Error saving door:', error);
      Alert.alert('Feil', error.response?.data?.message || 'Kunne ikke lagre dør');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteDoor = (door: Door) => {
    Alert.alert(
      'Bekreft sletting',
      `Er du sikker på at du vil slette "${door.name}"?`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteDoor(door.id);
              Alert.alert('Suksess', 'Dør slettet');
              fetchDoors();
            } catch (error: any) {
              Alert.alert('Feil', error.response?.data?.message || 'Kunne ikke slette dør');
            }
          },
        },
      ]
    );
  };

  const handleTestConnection = async (door: Door) => {
    try {
      setActionLoading(`test-${door.id}`);
      const response = await api.testDoorConnection(door.id);
      if (response.success) {
        Alert.alert('Tilkobling OK', 'Døren svarer normalt');
      } else {
        Alert.alert('Tilkobling feilet', response.message || 'Kunne ikke koble til døren');
      }
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.message || 'Kunne ikke teste tilkobling');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLockUnlock = async (door: Door) => {
    try {
      setActionLoading(`lock-${door.id}`);
      if (door.isLocked) {
        await api.unlockDoor(door.id);
        Alert.alert('Suksess', `${door.name} låst opp`);
      } else {
        await api.lockDoor(door.id);
        Alert.alert('Suksess', `${door.name} låst`);
      }
      fetchDoors();
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.message || 'Kunne ikke endre låsstatus');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredDoors = doors.filter(
    (door) =>
      door.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      door.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (isOnline: boolean) => {
    return isOnline ? '#10B981' : '#EF4444';
  };

  const getStatusLabel = (isOnline: boolean) => {
    return isOnline ? 'Tilkoblet' : 'Frakoblet';
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Dørstyring</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => navigation.navigate('AccessLogs')}
              style={styles.logsButton}
            >
              <Ionicons name="list" size={24} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleOpenModal()} style={styles.addButton}>
              <Ionicons name="add" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Søk etter dør eller lokasjon..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Door List */}
        <ScrollView
          style={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {filteredDoors.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="lock-closed-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>
                {searchQuery ? 'Ingen dører funnet' : 'Ingen dører registrert'}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery ? 'Prøv et annet søk' : 'Legg til din første dør'}
              </Text>
            </View>
          ) : (
            <View style={styles.doorGrid}>
              {filteredDoors.map((door) => (
                <View key={door.id} style={styles.doorCard}>
                  {/* Status Badge */}
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(door.isOnline) }]}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>{getStatusLabel(door.isOnline)}</Text>
                  </View>

                  {/* Door Info */}
                  <View style={styles.doorHeader}>
                    <Ionicons name="lock-closed" size={32} color="#3B82F6" />
                    <View style={styles.doorInfo}>
                      <Text style={styles.doorName}>{door.name}</Text>
                      <Text style={styles.doorLocation}>
                        <Ionicons name="location-outline" size={14} color="#6B7280" /> {door.location}
                      </Text>
                    </View>
                  </View>

                  {/* Door Details */}
                  <View style={styles.doorDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>IP-adresse:</Text>
                      <Text style={styles.detailValue}>{door.ipAddress}:{door.port}</Text>
                    </View>
                    {door.macAddress && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>MAC-adresse:</Text>
                        <Text style={styles.detailValue}>{door.macAddress}</Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status:</Text>
                      <Text style={[styles.detailValue, { color: door.isLocked ? '#EF4444' : '#10B981' }]}>
                        {door.isLocked ? 'Låst' : 'Ulåst'}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.testButton]}
                      onPress={() => handleTestConnection(door)}
                      disabled={actionLoading === `test-${door.id}`}
                    >
                      {actionLoading === `test-${door.id}` ? (
                        <ActivityIndicator size="small" color="#3B82F6" />
                      ) : (
                        <>
                          <Ionicons name="flash-outline" size={16} color="#3B82F6" />
                          <Text style={styles.testButtonText}>Test</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, door.isLocked ? styles.unlockButton : styles.lockButton]}
                      onPress={() => handleLockUnlock(door)}
                      disabled={actionLoading === `lock-${door.id}`}
                    >
                      {actionLoading === `lock-${door.id}` ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <>
                          <Ionicons
                            name={door.isLocked ? 'lock-open-outline' : 'lock-closed-outline'}
                            size={16}
                            color="#FFF"
                          />
                          <Text style={styles.lockButtonText}>
                            {door.isLocked ? 'Lås opp' : 'Lås'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Menu Buttons */}
                  <View style={styles.menuButtons}>
                    <TouchableOpacity
                      style={styles.menuButton}
                      onPress={() => navigation.navigate('DoorAccessRules', { doorId: door.id, doorName: door.name })}
                    >
                      <Ionicons name="shield-checkmark-outline" size={18} color="#6B7280" />
                      <Text style={styles.menuButtonText}>Tilgangsregler</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuButton}
                      onPress={() => handleOpenModal(door)}
                    >
                      <Ionicons name="create-outline" size={18} color="#6B7280" />
                      <Text style={styles.menuButtonText}>Rediger</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuButton}
                      onPress={() => handleDeleteDoor(door)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      <Text style={[styles.menuButtonText, { color: '#EF4444' }]}>Slett</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Create/Edit Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={handleCloseModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editMode ? 'Rediger dør' : 'Legg til dør'}</Text>
                <TouchableOpacity onPress={handleCloseModal}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Navn *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                    placeholder="f.eks. Hovedinngang"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Lokasjon *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.location}
                    onChangeText={(text) => setFormData({ ...formData, location: text })}
                    placeholder="f.eks. 1. etasje"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>IP-adresse *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.ipAddress}
                    onChangeText={(text) => setFormData({ ...formData, ipAddress: text })}
                    placeholder="f.eks. 192.168.1.100"
                    keyboardType="default"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Port *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.port}
                    onChangeText={(text) => setFormData({ ...formData, port: text })}
                    placeholder="502"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>MAC-adresse</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.macAddress}
                    onChangeText={(text) => setFormData({ ...formData, macAddress: formatMacAddress(text) })}
                    placeholder="f.eks. 00:1A:2B:3C:4D:5E"
                    autoCapitalize="characters"
                    maxLength={17}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Beskrivelse</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                    placeholder="Tilleggsinformasjon om døren..."
                    multiline
                    numberOfLines={4}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCloseModal}>
                  <Text style={styles.cancelButtonText}>Avbryt</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, actionLoading === 'save' && styles.saveButtonDisabled]}
                  onPress={handleSaveDoor}
                  disabled={actionLoading === 'save'}
                >
                  {actionLoading === 'save' ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>{editMode ? 'Oppdater' : 'Opprett'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logsButton: {
    padding: 8,
  },
  addButton: {
    backgroundColor: '#3B82F6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  listContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  doorGrid: {
    padding: 16,
    gap: 16,
  },
  doorCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  doorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  doorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  doorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  doorLocation: {
    fontSize: 14,
    color: '#6B7280',
  },
  doorDetails: {
    gap: 8,
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  testButton: {
    backgroundColor: '#DBEAFE',
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  lockButton: {
    backgroundColor: '#EF4444',
  },
  unlockButton: {
    backgroundColor: '#10B981',
  },
  lockButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  menuButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    gap: 8,
  },
  menuButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  menuButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
    color: '#111827',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
