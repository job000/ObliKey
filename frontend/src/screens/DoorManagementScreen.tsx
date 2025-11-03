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
import { useTheme } from '../contexts/ThemeContext';

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
  const { colors } = useTheme();
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
    return isOnline ? colors.success : colors.danger;
  };

  const getStatusLabel = (isOnline: boolean) => {
    return isOnline ? 'Tilkoblet' : 'Frakoblet';
  };

  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.cardBg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>Dørstyring</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('AccessLogs')}
              style={{ padding: 8 }}
            >
              <Ionicons name="list" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleOpenModal()} style={{ backgroundColor: colors.primary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="add" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
          <Ionicons name="search" size={20} color={colors.textLight} style={{ marginRight: 8 }} />
          <TextInput
            style={{ flex: 1, paddingVertical: 12, fontSize: 16, color: colors.text }}
            placeholder="Søk etter dør eller lokasjon..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Door List */}
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {filteredDoors.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
              <Ionicons name="lock-closed-outline" size={64} color={colors.border} />
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.textSecondary, marginTop: 16 }}>
                {searchQuery ? 'Ingen dører funnet' : 'Ingen dører registrert'}
              </Text>
              <Text style={{ fontSize: 14, color: colors.textLight, marginTop: 4 }}>
                {searchQuery ? 'Prøv et annet søk' : 'Legg til din første dør'}
              </Text>
            </View>
          ) : (
            <View style={{ padding: 16, gap: 16 }}>
              {filteredDoors.map((door) => (
                <View key={door.id} style={{ backgroundColor: colors.cardBg, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
                  {/* Status Badge */}
                  <View style={{ position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4, backgroundColor: getStatusColor(door.isOnline) }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' }} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFF' }}>{getStatusLabel(door.isOnline)}</Text>
                  </View>

                  {/* Door Info */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                    <Ionicons name="lock-closed" size={32} color={colors.primary} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>{door.name}</Text>
                      <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                        <Ionicons name="location-outline" size={14} color={colors.textSecondary} /> {door.location}
                      </Text>
                    </View>
                  </View>

                  {/* Door Details */}
                  <View style={{ gap: 8, marginBottom: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 14, color: colors.textSecondary }}>IP-adresse:</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{door.ipAddress}:{door.port}</Text>
                    </View>
                    {door.macAddress && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 14, color: colors.textSecondary }}>MAC-adresse:</Text>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{door.macAddress}</Text>
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 14, color: colors.textSecondary }}>Status:</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: door.isLocked ? colors.danger : colors.success }}>
                        {door.isLocked ? 'Låst' : 'Ulåst'}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6, backgroundColor: '#DBEAFE' }}
                      onPress={() => handleTestConnection(door)}
                      disabled={actionLoading === `test-${door.id}`}
                    >
                      {actionLoading === `test-${door.id}` ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <>
                          <Ionicons name="flash-outline" size={16} color={colors.primary} />
                          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>Test</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6, backgroundColor: door.isLocked ? colors.success : colors.danger }}
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
                          <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFF' }}>
                            {door.isLocked ? 'Lås opp' : 'Lås'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Menu Buttons */}
                  <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 8 }}>
                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 4 }}
                      onPress={() => navigation.navigate('DoorAccessRules', { doorId: door.id, doorName: door.name })}
                    >
                      <Ionicons name="shield-checkmark-outline" size={18} color={colors.textSecondary} />
                      <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary }}>Tilgangsregler</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 4 }}
                      onPress={() => handleOpenModal(door)}
                    >
                      <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                      <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary }}>Rediger</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 4 }}
                      onPress={() => handleDeleteDoor(door)}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                      <Text style={{ fontSize: 13, fontWeight: '500', color: colors.danger }}>Slett</Text>
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
            style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}
          >
            <View style={{ backgroundColor: colors.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>{editMode ? 'Rediger dør' : 'Legg til dør'}</Text>
                <TouchableOpacity onPress={handleCloseModal}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ padding: 20 }}>
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Navn *</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: colors.cardBg, color: colors.text }}
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                    placeholder="f.eks. Hovedinngang"
                    placeholderTextColor={colors.textLight}
                  />
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Lokasjon *</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: colors.cardBg, color: colors.text }}
                    value={formData.location}
                    onChangeText={(text) => setFormData({ ...formData, location: text })}
                    placeholder="f.eks. 1. etasje"
                    placeholderTextColor={colors.textLight}
                  />
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>IP-adresse *</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: colors.cardBg, color: colors.text }}
                    value={formData.ipAddress}
                    onChangeText={(text) => setFormData({ ...formData, ipAddress: text })}
                    placeholder="f.eks. 192.168.1.100"
                    placeholderTextColor={colors.textLight}
                    keyboardType="default"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Port *</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: colors.cardBg, color: colors.text }}
                    value={formData.port}
                    onChangeText={(text) => setFormData({ ...formData, port: text })}
                    placeholder="502"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                  />
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>MAC-adresse</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: colors.cardBg, color: colors.text }}
                    value={formData.macAddress}
                    onChangeText={(text) => setFormData({ ...formData, macAddress: formatMacAddress(text) })}
                    placeholder="f.eks. 00:1A:2B:3C:4D:5E"
                    placeholderTextColor={colors.textLight}
                    autoCapitalize="characters"
                    maxLength={17}
                  />
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Beskrivelse</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: colors.cardBg, color: colors.text, height: 100, textAlignVertical: 'top' }}
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                    placeholder="Tilleggsinformasjon om døren..."
                    placeholderTextColor={colors.textLight}
                    multiline
                    numberOfLines={4}
                  />
                </View>
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
                <TouchableOpacity style={{ flex: 1, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }} onPress={handleCloseModal}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textSecondary }}>Avbryt</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: actionLoading === 'save' ? colors.textLight : colors.primary, alignItems: 'center' }}
                  onPress={handleSaveDoor}
                  disabled={actionLoading === 'save'}
                >
                  {actionLoading === 'save' ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFF' }}>{editMode ? 'Oppdater' : 'Opprett'}</Text>
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

const styles = StyleSheet.create({});
