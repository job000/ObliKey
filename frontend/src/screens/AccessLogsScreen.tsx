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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';

interface AccessLog {
  id: string;
  doorId: string;
  userId?: string;
  action: string;
  method: string;
  success: boolean;
  reason?: string;
  ipAddress?: string;
  metadata?: any;
  createdAt: string;
  door: { id: string; name: string; type?: string; location?: string };
  user?: { id: string; firstName: string; lastName: string; email: string; role: string };
}

interface AccessStats {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  successRate: number;
  uniqueUsers: number;
  byAction: Array<{ action: string; count: number }>;
  byMethod: Array<{ method: string; count: number }>;
  topDoors: Array<{ doorId: string; doorName: string; doorType: string; count: number }>;
}

export default function AccessLogsScreen({ navigation }: any) {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [stats, setStats] = useState<AccessStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    doorId: '',
    userId: '',
    success: '',
    startDate: '',
    endDate: '',
  });

  // Lookup data
  const [doors, setDoors] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    fetchLookupData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.doorId) params.doorId = filters.doorId;
      if (filters.userId) params.userId = filters.userId;
      if (filters.success) params.success = filters.success === 'true';
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const [logsResponse, statsResponse] = await Promise.all([
        api.getAccessLogs(params),
        api.getAccessLogStats({ startDate: filters.startDate, endDate: filters.endDate }).catch(() => null),
      ]);

      if (logsResponse.success) {
        setLogs(logsResponse.data || []);
      }
      if (statsResponse?.success) {
        setStats(statsResponse.data);
      }
    } catch (error: any) {
      console.error('Error fetching logs:', error);
      Alert.alert('Feil', 'Kunne ikke hente tilgangslogger');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchLookupData = async () => {
    try {
      const [doorsRes, usersRes] = await Promise.all([
        api.getDoors().catch(() => ({ data: [] })),
        api.getUsers().catch(() => ({ data: [] })),
      ]);
      setDoors(doorsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error) {
      console.error('Error fetching lookup data:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleApplyFilters = () => {
    setFilterModalVisible(false);
    fetchData();
  };

  const handleClearFilters = () => {
    setFilters({
      doorId: '',
      userId: '',
      success: '',
      startDate: '',
      endDate: '',
    });
  };

  const handleExportLogs = async () => {
    try {
      Alert.alert('Eksporterer', 'Eksporterer tilgangslogger til CSV...');
      const response = await api.exportAccessLogs({
        doorId: filters.doorId || undefined,
        userId: filters.userId || undefined,
        success: filters.success ? filters.success === 'true' : undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      if (response.success) {
        Alert.alert('Suksess', 'Logger eksportert til CSV');
      }
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.message || 'Kunne ikke eksportere logger');
    }
  };

  const handleViewDetails = (log: AccessLog) => {
    setSelectedLog(log);
    setDetailModalVisible(true);
  };

  const getResultColor = (success: boolean) => {
    return success ? '#10B981' : '#EF4444';
  };

  const getResultIcon = (success: boolean) => {
    return success ? 'checkmark-circle' : 'close-circle';
  };

  const getResultLabel = (success: boolean) => {
    return success ? 'Godkjent' : 'Nektet';
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('nb-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

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
          <Text style={styles.title}>Tilgangslogger</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setFilterModalVisible(true)} style={styles.iconButton}>
              <Ionicons name="filter" size={24} color={hasActiveFilters ? '#3B82F6' : '#6B7280'} />
              {hasActiveFilters && <View style={styles.filterBadge} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleExportLogs} style={styles.iconButton}>
              <Ionicons name="download-outline" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, styles.totalCard]}>
              <Text style={styles.statValue}>{stats.totalAttempts}</Text>
              <Text style={styles.statLabel}>Totalt</Text>
            </View>
            <View style={[styles.statCard, styles.grantedCard]}>
              <Text style={styles.statValue}>{stats.successfulAttempts}</Text>
              <Text style={styles.statLabel}>Godkjent</Text>
            </View>
            <View style={[styles.statCard, styles.deniedCard]}>
              <Text style={styles.statValue}>{stats.failedAttempts}</Text>
              <Text style={styles.statLabel}>Nektet</Text>
            </View>
          </View>
        )}

        {/* Logs List */}
        <ScrollView
          style={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {logs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>Ingen logger funnet</Text>
              <Text style={styles.emptyStateSubtext}>
                {hasActiveFilters ? 'Prøv andre filtre' : 'Ingen tilgangslogger registrert'}
              </Text>
            </View>
          ) : (
            <View style={styles.logsList}>
              {logs.map((log) => (
                <TouchableOpacity
                  key={log.id}
                  style={styles.logCard}
                  onPress={() => handleViewDetails(log)}
                >
                  {/* Result Badge */}
                  <View
                    style={[
                      styles.resultBadge,
                      { backgroundColor: getResultColor(log.success) },
                    ]}
                  >
                    <Ionicons name={getResultIcon(log.success)} size={20} color="#FFF" />
                  </View>

                  {/* Log Info */}
                  <View style={styles.logContent}>
                    <View style={styles.logHeader}>
                      <Text style={styles.doorName}>{log.door.name}</Text>
                      <Text style={styles.timestamp}>{formatDateTime(log.createdAt)}</Text>
                    </View>

                    <View style={styles.logDetails}>
                      {log.door.location && (
                        <View style={styles.detailItem}>
                          <Ionicons name="location-outline" size={14} color="#6B7280" />
                          <Text style={styles.detailText}>{log.door.location}</Text>
                        </View>
                      )}
                      {log.user && (
                        <View style={styles.detailItem}>
                          <Ionicons name="person-outline" size={14} color="#6B7280" />
                          <Text style={styles.detailText}>
                            {log.user.firstName} {log.user.lastName}
                          </Text>
                        </View>
                      )}
                      <View style={styles.detailItem}>
                        <Ionicons
                          name={getResultIcon(log.success)}
                          size={14}
                          color={getResultColor(log.success)}
                        />
                        <Text style={[styles.detailText, { color: getResultColor(log.success) }]}>
                          {getResultLabel(log.success)}
                        </Text>
                      </View>
                      {log.method && (
                        <View style={styles.detailItem}>
                          <Ionicons name="key-outline" size={14} color="#6B7280" />
                          <Text style={styles.detailText}>{log.method}</Text>
                        </View>
                      )}
                    </View>

                    {log.reason && (
                      <View style={styles.reasonContainer}>
                        <Text style={styles.reasonText}>{log.reason}</Text>
                      </View>
                    )}
                  </View>

                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Filter Modal */}
        <Modal
          visible={filterModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setFilterModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filtrer logger</Text>
                <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {doors.length > 0 && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Dør</Text>
                    <ScrollView style={styles.selectContainer} nestedScrollEnabled>
                      {doors.map((door) => (
                        <TouchableOpacity
                          key={door.id}
                          style={[
                            styles.selectItem,
                            filters.doorId === door.id && styles.selectItemSelected,
                          ]}
                          onPress={() =>
                            setFilters({
                              ...filters,
                              doorId: filters.doorId === door.id ? '' : door.id,
                            })
                          }
                        >
                          <Text style={styles.selectItemText}>
                            {door.name} {door.location ? `- ${door.location}` : ''}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {users.length > 0 && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Bruker</Text>
                    <ScrollView style={styles.selectContainer} nestedScrollEnabled>
                      {users.map((user) => (
                        <TouchableOpacity
                          key={user.id}
                          style={[
                            styles.selectItem,
                            filters.userId === user.id && styles.selectItemSelected,
                          ]}
                          onPress={() =>
                            setFilters({
                              ...filters,
                              userId: filters.userId === user.id ? '' : user.id,
                            })
                          }
                        >
                          <Text style={styles.selectItemText}>
                            {user.firstName} {user.lastName}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Resultat</Text>
                  <View style={styles.resultSelector}>
                    <TouchableOpacity
                      style={[
                        styles.resultButton,
                        filters.success === 'true' && styles.resultButtonGranted,
                      ]}
                      onPress={() =>
                        setFilters({
                          ...filters,
                          success: filters.success === 'true' ? '' : 'true',
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.resultButtonText,
                          filters.success === 'true' && styles.resultButtonTextActive,
                        ]}
                      >
                        Godkjent
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.resultButton,
                        filters.success === 'false' && styles.resultButtonDenied,
                      ]}
                      onPress={() =>
                        setFilters({
                          ...filters,
                          success: filters.success === 'false' ? '' : 'false',
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.resultButtonText,
                          filters.success === 'false' && styles.resultButtonTextActive,
                        ]}
                      >
                        Nektet
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Fra dato</Text>
                  <TextInput
                    style={styles.input}
                    value={filters.startDate}
                    onChangeText={(text) => setFilters({ ...filters, startDate: text })}
                    placeholder="YYYY-MM-DD"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Til dato</Text>
                  <TextInput
                    style={styles.input}
                    value={filters.endDate}
                    onChangeText={(text) => setFilters({ ...filters, endDate: text })}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.clearButton} onPress={handleClearFilters}>
                  <Text style={styles.clearButtonText}>Nullstill</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.applyButton} onPress={handleApplyFilters}>
                  <Text style={styles.applyButtonText}>Bruk filtre</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Detail Modal */}
        <Modal
          visible={detailModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setDetailModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Loggdetaljer</Text>
                <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {selectedLog && (
                <ScrollView style={styles.modalBody}>
                  <View style={styles.detailSection}>
                    <View
                      style={[
                        styles.detailResultBadge,
                        { backgroundColor: getResultColor(selectedLog.success) },
                      ]}
                    >
                      <Ionicons
                        name={getResultIcon(selectedLog.success)}
                        size={32}
                        color="#FFF"
                      />
                      <Text style={styles.detailResultText}>
                        {getResultLabel(selectedLog.success)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Dør</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Navn:</Text>
                      <Text style={styles.detailValue}>{selectedLog.door.name}</Text>
                    </View>
                    {selectedLog.door.location && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Lokasjon:</Text>
                        <Text style={styles.detailValue}>{selectedLog.door.location}</Text>
                      </View>
                    )}
                  </View>

                  {selectedLog.user && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Bruker</Text>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Navn:</Text>
                        <Text style={styles.detailValue}>
                          {selectedLog.user.firstName} {selectedLog.user.lastName}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>E-post:</Text>
                        <Text style={styles.detailValue}>{selectedLog.user.email}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Rolle:</Text>
                        <Text style={styles.detailValue}>{selectedLog.user.role}</Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Tilgangsinformasjon</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Handling:</Text>
                      <Text style={styles.detailValue}>{selectedLog.action}</Text>
                    </View>
                    {selectedLog.method && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Metode:</Text>
                        <Text style={styles.detailValue}>{selectedLog.method}</Text>
                      </View>
                    )}
                    {selectedLog.ipAddress && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>IP-adresse:</Text>
                        <Text style={styles.detailValue}>{selectedLog.ipAddress}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Tidspunkt</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Dato og tid:</Text>
                      <Text style={styles.detailValue}>
                        {formatDateTime(selectedLog.createdAt)}
                      </Text>
                    </View>
                  </View>

                  {selectedLog.reason && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Årsak</Text>
                      <Text style={styles.detailReasonText}>{selectedLog.reason}</Text>
                    </View>
                  )}

                  {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Metadata</Text>
                      <Text style={styles.detailReasonText}>
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </Text>
                    </View>
                  )}
                </ScrollView>
              )}

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setDetailModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Lukk</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  grantedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  deniedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
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
  logsList: {
    padding: 16,
    gap: 12,
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logContent: {
    flex: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  doorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
  },
  logDetails: {
    gap: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#6B7280',
  },
  reasonContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  reasonText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
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
  selectContainer: {
    maxHeight: 200,
  },
  selectItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
    marginBottom: 8,
  },
  selectItemSelected: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  selectItemText: {
    fontSize: 14,
    color: '#111827',
  },
  resultSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  resultButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  resultButtonGranted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  resultButtonDenied: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  resultButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  resultButtonTextActive: {
    color: '#FFF',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  closeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  detailResultBadge: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    marginBottom: 8,
  },
  detailResultText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 8,
  },
  detailReasonText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});
