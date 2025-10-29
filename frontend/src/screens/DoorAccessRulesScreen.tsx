import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';

interface AccessRule {
  id: string;
  doorId: string;
  tenantId: string;
  name: string;
  description?: string;
  type: 'USER_SPECIFIC' | 'ROLE' | 'MEMBERSHIP' | 'TIME_BASED' | 'CREDENTIAL';
  priority: number;
  active: boolean;
  allowedRoles: string[];
  allowedUserIds: string[];
  allowedMembershipStatuses: string[];
  validFrom?: string;
  validUntil?: string;
  timeSlots?: any[];
  createdAt: string;
  users?: Array<{ id: string; firstName: string; lastName: string; email: string }>;
}

export default function DoorAccessRulesScreen({ route, navigation }: any) {
  const { doorId, doorName } = route.params;
  const [rules, setRules] = useState<AccessRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AccessRule | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'USER_SPECIFIC' as 'USER_SPECIFIC' | 'ROLE' | 'MEMBERSHIP' | 'TIME_BASED',
    allowedUserIds: [] as string[],
    allowedRoles: [] as string[],
    priority: '1',
    active: true,
  });

  // Lookup data
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchRules();
    fetchLookupData();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await api.getDoorAccessRules(doorId);
      if (response.success) {
        setRules(response.data || []);
      }
    } catch (error: any) {
      console.error('Error fetching rules:', error);
      Alert.alert('Feil', 'Kunne ikke hente tilgangsregler');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchLookupData = async () => {
    try {
      const usersRes = await api.getUsers().catch(() => ({ data: [] }));
      setUsers(usersRes.data || []);
    } catch (error) {
      console.error('Error fetching lookup data:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRules();
  };

  const handleOpenModal = (rule?: AccessRule) => {
    if (rule) {
      setEditMode(true);
      setSelectedRule(rule);
      setFormData({
        name: rule.name,
        description: rule.description || '',
        type: rule.type,
        allowedUserIds: rule.allowedUserIds || [],
        allowedRoles: rule.allowedRoles || [],
        priority: rule.priority.toString(),
        active: rule.active,
      });
    } else {
      setEditMode(false);
      setSelectedRule(null);
      setFormData({
        name: '',
        description: '',
        type: 'USER_SPECIFIC',
        allowedUserIds: [],
        allowedRoles: [],
        priority: '1',
        active: true,
      });
    }
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedRule(null);
    setEditMode(false);
  };

  const handleSaveRule = async () => {
    try {
      setActionLoading('save');

      if (!formData.name.trim()) {
        Alert.alert('Feil', 'Navn er påkrevd');
        return;
      }

      if (formData.type === 'USER_SPECIFIC' && formData.allowedUserIds.length === 0) {
        Alert.alert('Feil', 'Velg minst én bruker for bruker-spesifikk regel');
        return;
      }

      if (formData.type === 'ROLE' && formData.allowedRoles.length === 0) {
        Alert.alert('Feil', 'Velg minst én rolle for rolle-basert regel');
        return;
      }

      const ruleData: any = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type,
        priority: parseInt(formData.priority) || 1,
        active: formData.active,
        allowedUserIds: formData.allowedUserIds,
        allowedRoles: formData.allowedRoles,
        allowedMembershipStatuses: [],
      };

      if (editMode && selectedRule) {
        await api.updateAccessRule(selectedRule.id, ruleData);
        Alert.alert('Suksess', 'Regel oppdatert');
      } else {
        ruleData.doorId = doorId;
        await api.createAccessRule(ruleData);
        Alert.alert('Suksess', 'Regel opprettet');
      }

      handleCloseModal();
      fetchRules();
    } catch (error: any) {
      console.error('Error saving rule:', error);
      Alert.alert('Feil', error.response?.data?.error || 'Kunne ikke lagre regel');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteRule = (rule: AccessRule) => {
    Alert.alert(
      'Bekreft sletting',
      'Er du sikker på at du vil slette denne regelen?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteAccessRule(rule.id);
              Alert.alert('Suksess', 'Regel slettet');
              fetchRules();
            } catch (error: any) {
              Alert.alert('Feil', error.response?.data?.error || 'Kunne ikke slette regel');
            }
          },
        },
      ]
    );
  };

  const toggleRuleStatus = async (rule: AccessRule) => {
    try {
      await api.updateAccessRule(rule.id, { active: !rule.active });
      fetchRules();
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.error || 'Kunne ikke endre status');
    }
  };

  const toggleUser = (userId: string) => {
    const newUserIds = formData.allowedUserIds.includes(userId)
      ? formData.allowedUserIds.filter((id) => id !== userId)
      : [...formData.allowedUserIds, userId];
    setFormData({ ...formData, allowedUserIds: newUserIds });
  };

  const toggleRole = (role: string) => {
    const newRoles = formData.allowedRoles.includes(role)
      ? formData.allowedRoles.filter((r) => r !== role)
      : [...formData.allowedRoles, role];
    setFormData({ ...formData, allowedRoles: newRoles });
  };

  const getRuleTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      USER_SPECIFIC: 'Bruker-spesifikk',
      ROLE: 'Rolle',
      MEMBERSHIP: 'Medlemskap',
      TIME_BASED: 'Tidsbasert',
      CREDENTIAL: 'Legitimasjon',
    };
    return labels[type] || type;
  };

  const getRuleDescription = (rule: AccessRule) => {
    if (rule.description) return rule.description;
    if (rule.type === 'USER_SPECIFIC' && rule.users && rule.users.length > 0) {
      return rule.users.map(u => `${u.firstName} ${u.lastName}`).join(', ');
    }
    if (rule.type === 'ROLE' && rule.allowedRoles && rule.allowedRoles.length > 0) {
      return rule.allowedRoles.join(', ');
    }
    return 'Ingen beskrivelse';
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
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title} numberOfLines={1}>Tilgangsregler</Text>
            <Text style={styles.subtitle} numberOfLines={1}>{doorName}</Text>
          </View>
          <TouchableOpacity onPress={() => handleOpenModal()} style={styles.addButton}>
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Rules List */}
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContentContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {rules.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="shield-checkmark-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>Ingen tilgangsregler</Text>
              <Text style={styles.emptyStateSubtext}>Legg til din første regel</Text>
            </View>
          ) : (
            rules
              .sort((a, b) => a.priority - b.priority)
              .map((rule) => (
                <View key={rule.id} style={styles.ruleCard}>
                  {/* Rule Header with Priority */}
                  <View style={styles.ruleHeader}>
                    <View style={styles.ruleHeaderLeft}>
                      <View style={styles.ruleIcon}>
                        <Ionicons
                          name={
                            rule.type === 'USER_SPECIFIC'
                              ? 'person'
                              : rule.type === 'ROLE'
                              ? 'shield'
                              : rule.type === 'MEMBERSHIP'
                              ? 'card'
                              : 'time'
                          }
                          size={20}
                          color="#3B82F6"
                        />
                      </View>
                      <View style={styles.ruleInfoContainer}>
                        <Text style={styles.ruleName} numberOfLines={1}>{rule.name}</Text>
                        <View style={styles.ruleMetadata}>
                          <Text style={styles.ruleType}>{getRuleTypeLabel(rule.type)}</Text>
                          <Text style={styles.rulePriority}>#{rule.priority}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, rule.active ? styles.activeStatus : styles.inactiveStatus]}>
                      <Text style={styles.statusText}>{rule.active ? 'Aktiv' : 'Inaktiv'}</Text>
                    </View>
                  </View>

                  {/* Rule Description */}
                  <Text style={styles.ruleDescription} numberOfLines={2}>{getRuleDescription(rule)}</Text>

                  {/* Rule Details */}
                  {(rule.validFrom || rule.validUntil) && (
                    <View style={styles.ruleDetails}>
                      {rule.validFrom && (
                        <View style={styles.detailRow}>
                          <Ionicons name="calendar-outline" size={12} color="#6B7280" />
                          <Text style={styles.detailText} numberOfLines={1}>
                            Fra: {new Date(rule.validFrom).toLocaleDateString('nb-NO')}
                          </Text>
                        </View>
                      )}
                      {rule.validUntil && (
                        <View style={styles.detailRow}>
                          <Ionicons name="calendar-outline" size={12} color="#6B7280" />
                          <Text style={styles.detailText} numberOfLines={1}>
                            Til: {new Date(rule.validUntil).toLocaleDateString('nb-NO')}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.ruleActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => toggleRuleStatus(rule)}
                    >
                      <Ionicons
                        name={rule.active ? 'pause' : 'play'}
                        size={16}
                        color="#6B7280"
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleOpenModal(rule)}
                    >
                      <Ionicons name="create-outline" size={16} color="#6B7280" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDeleteRule(rule)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
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
                <Text style={styles.modalTitle}>
                  {editMode ? 'Rediger regel' : 'Ny tilgangsregel'}
                </Text>
                <TouchableOpacity onPress={handleCloseModal}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Regelnavn *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                    placeholder="F.eks. 'Test Bruker - Spesialtilgang'"
                    placeholderTextColor="#9CA3AF"
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Regeltype *</Text>
                  <View style={styles.typeSelector}>
                    {['USER_SPECIFIC', 'ROLE'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeButton,
                          formData.type === type && styles.typeButtonActive,
                        ]}
                        onPress={() => setFormData({ ...formData, type: type as any })}
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            formData.type === type && styles.typeButtonTextActive,
                          ]}
                        >
                          {getRuleTypeLabel(type)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.hint}>
                    {formData.type === 'USER_SPECIFIC'
                      ? 'Bruker-spesifikk: Gi tilgang til utvalgte brukere (krever IKKE medlemskap)'
                      : 'Rolle-basert: Gi tilgang til alle brukere med valgte roller (CUSTOMER krever medlemskap)'}
                  </Text>
                </View>

                {formData.type === 'USER_SPECIFIC' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Velg brukere * ({formData.allowedUserIds.length} valgt)</Text>
                    <ScrollView
                      style={styles.userListScroll}
                      nestedScrollEnabled={true}
                      keyboardShouldPersistTaps="handled"
                    >
                      {users.filter(u => u.role === 'CUSTOMER').map((user) => (
                        <TouchableOpacity
                          key={user.id}
                          style={[
                            styles.userItem,
                            formData.allowedUserIds.includes(user.id) && styles.userItemSelected,
                          ]}
                          onPress={() => toggleUser(user.id)}
                        >
                          <View style={styles.userInfo}>
                            <Text style={styles.userName} numberOfLines={1}>
                              {user.firstName} {user.lastName}
                            </Text>
                            <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
                          </View>
                          {formData.allowedUserIds.includes(user.id) && (
                            <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {formData.type === 'ROLE' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Velg roller * ({formData.allowedRoles.length} valgt)</Text>
                    <View style={styles.roleSelector}>
                      {[
                        { value: 'CUSTOMER', label: 'Kunder', icon: 'person', description: 'Alle kunder (krever medlemskap)' },
                        { value: 'TRAINER', label: 'Trenere', icon: 'fitness', description: 'Alle trenere' },
                        { value: 'ADMIN', label: 'Admins', icon: 'shield-checkmark', description: 'Alle administratorer' },
                      ].map((role) => (
                        <TouchableOpacity
                          key={role.value}
                          style={[
                            styles.roleItem,
                            formData.allowedRoles.includes(role.value) && styles.roleItemSelected,
                          ]}
                          onPress={() => toggleRole(role.value)}
                        >
                          <View style={styles.roleItemLeft}>
                            <Ionicons
                              name={role.icon as any}
                              size={24}
                              color={formData.allowedRoles.includes(role.value) ? '#3B82F6' : '#6B7280'}
                            />
                            <View style={styles.roleInfo}>
                              <Text style={styles.roleName}>{role.label}</Text>
                              <Text style={styles.roleDescription} numberOfLines={1}>{role.description}</Text>
                            </View>
                          </View>
                          {formData.allowedRoles.includes(role.value) && (
                            <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={styles.hint}>
                      Rolle-basert: Alle brukere med valgte roller får tilgang. CUSTOMER-rolle krever aktivt medlemskap.
                    </Text>
                  </View>
                )}

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Prioritet *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.priority}
                    onChangeText={(text) => setFormData({ ...formData, priority: text })}
                    placeholder="1"
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                    returnKeyType="next"
                  />
                  <Text style={styles.hint}>Lavere tall = høyere prioritet (1 er høyest)</Text>
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.switchRow}>
                    <Text style={styles.label}>Aktiv regel</Text>
                    <Switch
                      value={formData.active}
                      onValueChange={(value) => setFormData({ ...formData, active: value })}
                      trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                      thumbColor={formData.active ? '#3B82F6' : '#F3F4F6'}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Beskrivelse</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                    placeholder="Tilleggsinformasjon..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={3}
                    returnKeyType="done"
                  />
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCloseModal}>
                  <Text style={styles.cancelButtonText}>Avbryt</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, actionLoading === 'save' && styles.saveButtonDisabled]}
                  onPress={handleSaveRule}
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
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#3B82F6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flex: 1,
  },
  listContentContainer: {
    padding: 16,
  },
  emptyState: {
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
  ruleCard: {
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
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  ruleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 8,
  },
  ruleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ruleInfoContainer: {
    flex: 1,
  },
  ruleName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  ruleMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleType: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
    textTransform: 'uppercase',
  },
  rulePriority: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeStatus: {
    backgroundColor: '#D1FAE5',
  },
  inactiveStatus: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#111827',
  },
  ruleDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  ruleDetails: {
    gap: 6,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  ruleActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
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
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
    maxHeight: '70%',
  },
  formGroup: {
    marginBottom: 20,
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
    height: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
    lineHeight: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  typeButton: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  typeButtonTextActive: {
    color: '#FFF',
  },
  userListScroll: {
    maxHeight: 250,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
    marginBottom: 8,
  },
  userItemSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  userInfo: {
    flex: 1,
    marginRight: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleSelector: {
    gap: 12,
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  roleItemSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  roleItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  roleDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
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
