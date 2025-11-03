import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Container from '../components/Container';
import { api } from '../services/api';

interface WorkoutTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  exercises: any[];
  isVisibleToCustomers?: boolean;
}

export default function WorkoutTemplateManagementScreen({ navigation }: any) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.getWorkoutTemplates();
      if (response.success) {
        // Filter to only show shared templates (created by admins)
        const sharedTemplates = response.data.filter((t: any) => t.isShared);
        setTemplates(sharedTemplates);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      Alert.alert('Feil', 'Kunne ikke laste inn treningsprogrammaler');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleToggleVisibility = async (templateId: string, currentValue: boolean) => {
    try {
      setTogglingId(templateId);
      const newValue = !currentValue;

      const response = await api.toggleTemplateVisibility(templateId, newValue);

      if (response.success) {
        // Update local state
        setTemplates(prev =>
          prev.map(t =>
            t.id === templateId ? { ...t, isVisibleToCustomers: newValue } : t
          )
        );

        Alert.alert(
          'Suksess',
          newValue
            ? 'Mal er nå synlig for kunder'
            : 'Mal er nå skjult for kunder'
        );
      } else {
        Alert.alert('Feil', response.error || 'Kunne ikke endre synlighet');
      }
    } catch (error: any) {
      console.error('Failed to toggle visibility:', error);
      Alert.alert('Feil', error.message || 'Kunne ikke endre synlighet');
    } finally {
      setTogglingId(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTemplates();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Laster maler...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Container>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Treningsprogrammaler</Text>
            <Text style={styles.subtitle}>
              Administrer synlighet for {templates.length} maler
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="information-circle" size={24} color="#3B82F6" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Synlighetskontroll</Text>
            <Text style={styles.infoText}>
              Skru på/av synlighet for å kontrollere hvilke treningsprogrammaler som vises for kunder.
            </Text>
          </View>
        </View>

        <View style={styles.templatesList}>
          {templates.map((template) => (
            <View key={template.id} style={styles.templateCard}>
              <View style={styles.templateHeader}>
                <View style={styles.templateIcon}>
                  <Ionicons name="fitness" size={24} color="#EF4444" />
                </View>
                <View style={styles.templateInfo}>
                  <Text style={styles.templateName}>{template.name}</Text>
                  {template.description && (
                    <Text style={styles.templateDescription} numberOfLines={2}>
                      {template.description}
                    </Text>
                  )}
                  <View style={styles.templateMeta}>
                    <Ionicons name="barbell" size={14} color="#6B7280" />
                    <Text style={styles.templateMetaText}>
                      {template.exercises?.length || 0} øvelser
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.visibilityControl}>
                <View style={styles.visibilityInfo}>
                  <Text style={styles.visibilityLabel}>Synlig for kunder</Text>
                  <Text style={styles.visibilityStatus}>
                    {template.isVisibleToCustomers ? 'Aktivert' : 'Deaktivert'}
                  </Text>
                </View>
                <Switch
                  value={template.isVisibleToCustomers !== false}
                  onValueChange={() =>
                    handleToggleVisibility(
                      template.id,
                      template.isVisibleToCustomers !== false
                    )
                  }
                  disabled={togglingId === template.id}
                  trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                  thumbColor={template.isVisibleToCustomers ? '#FFF' : '#F3F4F6'}
                />
              </View>
            </View>
          ))}

          {templates.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="fitness-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Ingen maler funnet</Text>
              <Text style={styles.emptyText}>
                Det finnes ingen treningsprogrammaler å administrere
              </Text>
            </View>
          )}
        </View>
      </Container>
    </ScrollView>
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoIcon: {
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  templatesList: {
    gap: 12,
    paddingBottom: 24,
  },
  templateCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  templateHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  templateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  templateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  templateMetaText: {
    fontSize: 13,
    color: '#6B7280',
  },
  visibilityControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  visibilityInfo: {
    flex: 1,
  },
  visibilityLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  visibilityStatus: {
    fontSize: 13,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
