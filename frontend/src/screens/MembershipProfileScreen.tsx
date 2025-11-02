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
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Membership, MemberActivityOverview, MembershipCheckIn } from '../types/membership';

const MembershipProfileScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [activity, setActivity] = useState<MemberActivityOverview | null>(null);
  const [activeCheckIn, setActiveCheckIn] = useState<MembershipCheckIn | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch all memberships (not just ACTIVE) to include FROZEN memberships
      const membershipsResponse = await api.getMemberships({});
      const memberships = membershipsResponse.data || [];

      // Filter to get active or frozen memberships (not cancelled/suspended/blacklisted)
      const activeMemberships = memberships.filter((m: Membership) =>
        m.status === 'ACTIVE' || m.status === 'FROZEN'
      );

      if (activeMemberships.length > 0) {
        const userMembership = activeMemberships[0];
        setMembership(userMembership);

        const [activityData, checkInData] = await Promise.all([
          api.getMemberActivityOverview(userMembership.id),
          api.getActiveCheckIn()
        ]);

        setActivity(activityData.data);
        setActiveCheckIn(checkInData.data);
      }
    } catch (error: any) {
      console.error('Error fetching membership:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleCheckIn = async () => {
    if (!membership) return;

    try {
      await api.checkIn('Hovedsenter');
      Alert.alert('Suksess', 'Du er nå innsjekket');
      fetchData();
    } catch (error: any) {
      console.error('Check-in error:', error);
      Alert.alert('Feil', error.response?.data?.error || error.response?.data?.message || 'Kunne ikke sjekke inn');
    }
  };

  const handleCheckOut = async () => {
    if (!activeCheckIn) return;

    try {
      await api.checkOut(activeCheckIn.id);
      Alert.alert('Suksess', 'Du er nå utsjekket');
      fetchData();
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.message || 'Kunne ikke sjekke ut');
    }
  };

  const handleFreezeMembership = () => {
    if (!membership) return;

    Alert.alert(
      'Frys medlemskap',
      'Hvor lenge vil du fryse medlemskapet ditt?',
      [
        {
          text: 'Avbryt',
          style: 'cancel'
        },
        {
          text: '1 uke',
          onPress: () => freezeMembership(7)
        },
        {
          text: '2 uker',
          onPress: () => freezeMembership(14)
        },
        {
          text: '1 måned',
          onPress: () => freezeMembership(30)
        }
      ]
    );
  };

  const freezeMembership = async (days: number) => {
    if (!membership) return;

    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      await api.freezeMembership(membership.id, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        reason: `Fryst i ${days} dager`
      });

      Alert.alert('Suksess', 'Medlemskapet er nå fryst');
      fetchData();
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.message || 'Kunne ikke fryse medlemskap');
    }
  };

  const handlePaymentHistory = () => {
    if (!membership) return;

    try {
      // Show payment history in an Alert for now
      const payments = membership?.payments || [];
      if (!Array.isArray(payments) || payments.length === 0) {
        Alert.alert('Betalingshistorikk', 'Ingen betalinger registrert ennå.');
        return;
      }

      const paymentSummary = payments
        .slice(0, 5)
        .map((p: any) => {
          const date = new Date(p.dueDate).toLocaleDateString('no-NO');
          const status = p.status === 'PAID' ? '✓ Betalt' : p.status === 'FAILED' ? '✗ Feilet' : 'Venter';
          return `${date}: ${p.amount} kr - ${status}`;
        })
        .join('\n');

      Alert.alert(
        'Betalingshistorikk',
        `Siste betalinger:\n\n${paymentSummary}${payments.length > 5 ? '\n\n... og flere' : ''}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Payment history error:', error);
      Alert.alert('Feil', 'Kunne ikke hente betalingshistorikk');
    }
  };

  const handleSupport = () => {
    Alert.alert(
      'Hjelp og support',
      'Trenger du hjelp?\n\nKontakt oss:\n• E-post: support@oblikey.no\n• Telefon: 123 45 678\n• Åpningstid: 06:00 - 22:00',
      [
        { text: 'Ring oss', onPress: () => console.log('Ring oss') },
        { text: 'Send e-post', onPress: () => console.log('Send e-post') },
        { text: 'Lukk', style: 'cancel' }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '#10B981';
      case 'FROZEN': return '#3B82F6';
      case 'CANCELLED': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ACTIVE: 'Aktiv',
      FROZEN: 'Fryst',
      CANCELLED: 'Kansellert'
    };
    return labels[status] || status;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('no-NO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateMembershipDuration = () => {
    if (!membership) return '';
    const start = new Date(membership.startDate);
    const now = new Date();
    const months = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    if (months < 1) return 'Mindre enn 1 måned';
    return `${months} ${months === 1 ? 'måned' : 'måneder'}`;
  };

  const getActiveFreezeInfo = () => {
    if (!membership || !membership.freezes || membership.freezes.length === 0) return null;

    // Get the most recent freeze
    const mostRecentFreeze = membership.freezes[0];

    // Check if this freeze is currently active
    const now = new Date();
    const freezeStart = new Date(mostRecentFreeze.startDate);
    const freezeEnd = new Date(mostRecentFreeze.endDate);

    if (now >= freezeStart && now <= freezeEnd) {
      return mostRecentFreeze;
    }

    return null;
  };

  const formatFreezeDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('no-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </SafeAreaView>
    );
  }

  if (!membership) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Ionicons name="card-outline" size={64} color="#9CA3AF" />
        <Text style={styles.emptyTitle}>Ingen aktivt medlemskap</Text>
        <Text style={styles.emptyText}>Du har ikke et aktivt medlemskap for øyeblikket</Text>
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Bli medlem</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Hei, {user?.firstName}!</Text>
          <Text style={styles.subheading}>Ditt medlemskap</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person-circle" size={40} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.planName}>{membership.plan?.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(membership.status) }]}>
            <Text style={styles.statusBadgeText}>{getStatusLabel(membership.status)}</Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            <Text style={styles.detailLabel}>Medlem siden</Text>
            <Text style={styles.detailValue}>{formatDate(membership.startDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color="#6B7280" />
            <Text style={styles.detailLabel}>Varighet</Text>
            <Text style={styles.detailValue}>{calculateMembershipDuration()}</Text>
          </View>
          {membership.status === 'FROZEN' && (() => {
            const freezeInfo = getActiveFreezeInfo();
            if (freezeInfo) {
              return (
                <View style={styles.detailRow}>
                  <Ionicons name="snow" size={20} color="#3B82F6" />
                  <Text style={styles.detailLabel}>Fryseperiode</Text>
                  <Text style={[styles.detailValue, styles.freezeValue]}>
                    {formatFreezeDate(freezeInfo.startDate)} - {formatFreezeDate(freezeInfo.endDate)}
                  </Text>
                </View>
              );
            }
            return null;
          })()}
          {membership.nextBillingDate && (
            <View style={styles.detailRow}>
              <Ionicons name="card-outline" size={20} color="#6B7280" />
              <Text style={styles.detailLabel}>Neste betaling</Text>
              <Text style={styles.detailValue}>{formatDate(membership.nextBillingDate)}</Text>
            </View>
          )}
          {membership.lastCheckInAt && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={20} color="#6B7280" />
              <Text style={styles.detailLabel}>Sist inne</Text>
              <Text style={styles.detailValue}>{formatDate(membership.lastCheckInAt)}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.checkInCard}>
        <View style={styles.checkInHeader}>
          <Ionicons name="enter-outline" size={24} color="#3B82F6" />
          <Text style={styles.checkInTitle}>Check-In</Text>
        </View>

        {activeCheckIn ? (
          <View>
            <Text style={styles.checkInStatus}>Du er innsjekket</Text>
            <Text style={styles.checkInTime}>
              Siden {new Date(activeCheckIn.checkInTime).toLocaleTimeString('no-NO', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
            <TouchableOpacity style={styles.checkOutButton} onPress={handleCheckOut}>
              <Text style={styles.checkOutButtonText}>Sjekk ut</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.checkInDescription}>
              Sjekk inn når du ankommer treningssenteret
            </Text>
            <TouchableOpacity style={styles.checkInButton} onPress={handleCheckIn}>
              <Text style={styles.checkInButtonText}>Sjekk inn nå</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {activity && (
        <>
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Statistikk</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{activity.checkInsCount || 0}</Text>
                <Text style={styles.statLabel}>Besøk totalt</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{activity.recentCheckIns?.length || 0}</Text>
                <Text style={styles.statLabel}>Siste 30 dager</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{activity.totalPaid || 0} kr</Text>
                <Text style={styles.statLabel}>Totalt betalt</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{activity.overduePayments?.length || 0}</Text>
                <Text style={styles.statLabel}>Forfalte</Text>
              </View>
            </View>
          </View>

          {activity.recentCheckIns && activity.recentCheckIns.length > 0 && (
            <View style={styles.historyCard}>
              <Text style={styles.historyTitle}>Siste besøk</Text>
              {activity.recentCheckIns.slice(0, 5).map((checkIn, index) => (
                <View key={checkIn.id} style={styles.historyItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyDate}>
                      {formatDate(checkIn.checkInTime)}
                    </Text>
                    <Text style={styles.historyTime}>
                      {new Date(checkIn.checkInTime).toLocaleTimeString('no-NO', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      {checkIn.checkOutTime && ` - ${new Date(checkIn.checkOutTime).toLocaleTimeString('no-NO', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}`}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      <View style={styles.actionsCard}>
        <TouchableOpacity style={styles.actionItem} onPress={handleFreezeMembership}>
          <Ionicons name="pause-circle-outline" size={24} color="#3B82F6" />
          <Text style={styles.actionText}>Frys medlemskap</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem} onPress={handlePaymentHistory}>
          <Ionicons name="document-text-outline" size={24} color="#3B82F6" />
          <Text style={styles.actionText}>Betalingshistorikk</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem} onPress={handleSupport}>
          <Ionicons name="help-circle-outline" size={24} color="#3B82F6" />
          <Text style={styles.actionText}>Hjelp og support</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};

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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subheading: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 12,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  freezeValue: {
    color: '#3B82F6',
  },
  checkInCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checkInHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkInTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  checkInStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 4,
  },
  checkInTime: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  checkInDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  checkInButton: {
    backgroundColor: '#3B82F6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  checkOutButton: {
    backgroundColor: '#EF4444',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  historyCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  historyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  historyTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  actionsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MembershipProfileScreen;
