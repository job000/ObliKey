import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  SafeAreaView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import Container from '../components/Container';

interface Review {
  id: string;
  rating: number;
  title?: string;
  comment: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED';
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
  product: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function ReviewManagementScreen({ navigation }: any) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED'>('PENDING');
  const [autoApprove, setAutoApprove] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    loadReviews();
    loadSettings();
  }, [filter]);

  const loadSettings = async () => {
    try {
      setLoadingSettings(true);
      const response = await api.getTenantSettings();
      if (response.success && response.data) {
        setAutoApprove(response.data.autoApproveReviews || false);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const loadReviews = async () => {
    try {
      setLoading(true);
      const status = filter === 'all' ? undefined : filter;
      const response = await api.getAllReviews(status);
      if (response.success) {
        setReviews(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load reviews:', error);
      if (error?.response?.status === 403) {
        Alert.alert('Feil', 'Du har ikke tilgang til å administrere anmeldelser');
      } else {
        Alert.alert('Feil', 'Kunne ikke laste anmeldelser');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReviews();
    loadSettings();
  };

  const toggleAutoApprove = async (value: boolean) => {
    try {
      setAutoApprove(value);
      await api.updateTenantSettings({ autoApproveReviews: value });
      Alert.alert(
        'Innstilling oppdatert',
        value
          ? 'Anmeldelser vil nå godkjennes automatisk'
          : 'Anmeldelser må nå godkjennes manuelt'
      );
    } catch (error) {
      console.error('Failed to update auto-approve setting:', error);
      Alert.alert('Feil', 'Kunne ikke oppdatere innstilling');
      // Revert on error
      setAutoApprove(!value);
    }
  };

  const moderateReview = async (reviewId: string, status: 'APPROVED' | 'REJECTED' | 'FLAGGED') => {
    try {
      await api.moderateReview(reviewId, status);
      Alert.alert('Suksess', 'Anmeldelse oppdatert');
      loadReviews();
    } catch (error) {
      console.error('Failed to moderate review:', error);
      Alert.alert('Feil', 'Kunne ikke oppdatere anmeldelse');
    }
  };

  const confirmModeration = (reviewId: string, action: 'APPROVED' | 'REJECTED' | 'FLAGGED') => {
    const actionText = action === 'APPROVED' ? 'godkjenne' : action === 'REJECTED' ? 'avvise' : 'flagge';
    Alert.alert(
      'Bekreft handling',
      `Er du sikker på at du vil ${actionText} denne anmeldelsen?`,
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Ja', onPress: () => moderateReview(reviewId, action) }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nb-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { color: '#F59E0B', text: 'Venter', bg: '#FEF3C7' };
      case 'APPROVED':
        return { color: '#10B981', text: 'Godkjent', bg: '#D1FAE5' };
      case 'REJECTED':
        return { color: '#EF4444', text: 'Avvist', bg: '#FEE2E2' };
      case 'FLAGGED':
        return { color: '#8B5CF6', text: 'Flagget', bg: '#EDE9FE' };
      default:
        return { color: '#6B7280', text: status, bg: '#F3F4F6' };
    }
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={16}
            color={star <= rating ? '#EAB308' : '#D1D5DB'}
            style={{ marginRight: 2 }}
          />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  const pendingCount = reviews.filter(r => r.status === 'PENDING').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screenHeader}>
        <Container>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Anmeldelser</Text>
            {pendingCount > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </View>
        </Container>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Container>
          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              <TouchableOpacity
                style={[styles.filterButton, filter === 'PENDING' && styles.filterButtonActive]}
                onPress={() => setFilter('PENDING')}
              >
                <Text style={[styles.filterButtonText, filter === 'PENDING' && styles.filterButtonTextActive]}>
                  Venter
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
                onPress={() => setFilter('all')}
              >
                <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
                  Alle
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filter === 'APPROVED' && styles.filterButtonActive]}
                onPress={() => setFilter('APPROVED')}
              >
                <Text style={[styles.filterButtonText, filter === 'APPROVED' && styles.filterButtonTextActive]}>
                  Godkjent
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filter === 'REJECTED' && styles.filterButtonActive]}
                onPress={() => setFilter('REJECTED')}
              >
                <Text style={[styles.filterButtonText, filter === 'REJECTED' && styles.filterButtonTextActive]}>
                  Avvist
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filter === 'FLAGGED' && styles.filterButtonActive]}
                onPress={() => setFilter('FLAGGED')}
              >
                <Text style={[styles.filterButtonText, filter === 'FLAGGED' && styles.filterButtonTextActive]}>
                  Flagget
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Auto-approve Setting */}
          <View style={styles.settingsCard}>
            <View style={styles.settingsRow}>
              <View style={styles.settingsLeft}>
                <Ionicons name="flash" size={20} color="#3B82F6" />
                <View style={styles.settingsTextContainer}>
                  <Text style={styles.settingsTitle}>Automatisk godkjenning</Text>
                  <Text style={styles.settingsDescription}>
                    {autoApprove
                      ? 'Anmeldelser godkjennes automatisk'
                      : 'Anmeldelser krever manuell godkjenning'}
                  </Text>
                </View>
              </View>
              <Switch
                value={autoApprove}
                onValueChange={toggleAutoApprove}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={autoApprove ? '#3B82F6' : '#F3F4F6'}
                disabled={loadingSettings}
              />
            </View>
          </View>

          {reviews.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Ingen anmeldelser funnet</Text>
            </View>
          ) : (
            <View style={styles.reviewsList}>
              {reviews.map((review) => {
                const badge = getStatusBadge(review.status);
                return (
                  <View key={review.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewHeaderLeft}>
                        <Text style={styles.productName}>{review.product.name}</Text>
                        <View style={styles.reviewMeta}>
                          {renderStars(review.rating)}
                          <Text style={styles.metaText}>
                            {review.user.firstName} {review.user.lastName}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.statusText, { color: badge.color }]}>
                          {badge.text}
                        </Text>
                      </View>
                    </View>

                    {review.title && (
                      <Text style={styles.reviewTitle}>{review.title}</Text>
                    )}
                    <Text style={styles.reviewComment}>{review.comment}</Text>

                    <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>

                    {review.status === 'PENDING' && (
                      <View style={styles.actionsContainer}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.approveButton]}
                          onPress={() => confirmModeration(review.id, 'APPROVED')}
                        >
                          <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                          <Text style={styles.actionButtonText}>Godkjenn</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.rejectButton]}
                          onPress={() => confirmModeration(review.id, 'REJECTED')}
                        >
                          <Ionicons name="close-circle-outline" size={20} color="#FFF" />
                          <Text style={styles.actionButtonText}>Avvis</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.flagButton]}
                          onPress={() => confirmModeration(review.id, 'FLAGGED')}
                        >
                          <Ionicons name="flag-outline" size={20} color="#FFF" />
                          <Text style={styles.actionButtonText}>Flagg</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {review.status !== 'PENDING' && review.status !== 'APPROVED' && (
                      <View style={styles.actionsContainer}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.approveButton, { flex: 1 }]}
                          onPress={() => confirmModeration(review.id, 'APPROVED')}
                        >
                          <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                          <Text style={styles.actionButtonText}>Godkjenn</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </Container>
      </ScrollView>
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
  },
  screenHeader: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  pendingBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  pendingBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterScroll: {
    gap: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  filterButtonTextActive: {
    color: '#FFF',
  },
  settingsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingsTextContainer: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  settingsDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  reviewsList: {
    gap: 16,
    paddingBottom: 24,
  },
  reviewCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  metaText: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  reviewDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  flagButton: {
    backgroundColor: '#8B5CF6',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
  },
});
