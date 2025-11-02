import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Container from '../components/Container';
import { api } from '../services/api';

interface PTPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  sessionCount: number;
  validityDays: number;
  featured: boolean;
}

interface PTCredits {
  available: number;
  total: number;
  used: number;
  credits: Array<{
    id: string;
    total: number;
    used: number;
    remaining: number;
    purchaseDate: string;
    expiryDate: string | null;
    isExpired: boolean;
    notes: string;
  }>;
}

export default function PTShopScreen({ navigation }: any) {
  const [packages, setPackages] = useState<PTPackage[]>([]);
  const [credits, setCredits] = useState<PTCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [packagesResponse, creditsResponse] = await Promise.all([
        api.getPTPackages(),
        api.getPTCredits(),
      ]);

      if (packagesResponse.success && packagesResponse.data) {
        setPackages(packagesResponse.data);
      }

      if (creditsResponse.success && creditsResponse.data) {
        setCredits(creditsResponse.data);
      }
    } catch (error: any) {
      console.error('Failed to load PT shop data:', error);
      Alert.alert('Feil', 'Kunne ikke laste PT-pakker');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePurchase = async (pkg: PTPackage) => {
    Alert.alert(
      'Bekreft kjøp',
      `Vil du kjøpe ${pkg.name} for ${pkg.price} kr?\n\n${pkg.sessionCount} PT-timer vil bli lagt til kontoen din.`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Kjøp',
          onPress: async () => {
            try {
              setPurchasing(pkg.id);

              // Create order
              const orderResponse = await api.createOrder({
                items: [{ productId: pkg.id, quantity: 1 }],
              });

              if (orderResponse.success) {
                Alert.alert(
                  'Kjøp vellykket!',
                  `Du har kjøpt ${pkg.name}. ${pkg.sessionCount} PT-timer er lagt til kontoen din.`,
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Refresh data to show updated credits
                        loadData();
                      },
                    },
                  ]
                );
              }
            } catch (error: any) {
              console.error('Purchase failed:', error);
              Alert.alert(
                'Kjøp feilet',
                error.response?.data?.error || 'Kunne ikke fullføre kjøpet'
              );
            } finally {
              setPurchasing(null);
            }
          },
        },
      ]
    );
  };

  const renderPackage = ({ item }: { item: PTPackage }) => {
    const discount = item.compareAtPrice
      ? Math.round(((item.compareAtPrice - item.price) / item.compareAtPrice) * 100)
      : 0;

    return (
      <TouchableOpacity
        style={[styles.packageCard, item.featured && styles.featuredCard]}
        onPress={() => handlePurchase(item)}
        disabled={purchasing === item.id}
      >
        {item.featured && (
          <View style={styles.featuredBadge}>
            <Ionicons name="star" size={12} color="#FFF" />
            <Text style={styles.featuredText}>POPULÆR</Text>
          </View>
        )}

        <View style={styles.packageHeader}>
          <Text style={styles.packageName}>{item.name}</Text>
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>Spar {discount}%</Text>
            </View>
          )}
        </View>

        <Text style={styles.packageDescription}>{item.description}</Text>

        <View style={styles.packageDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="fitness-outline" size={20} color="#3B82F6" />
            <Text style={styles.detailText}>{item.sessionCount} PT-timer</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color="#3B82F6" />
            <Text style={styles.detailText}>
              Gyldig i {item.validityDays} dager
            </Text>
          </View>
        </View>

        <View style={styles.packageFooter}>
          <View>
            {item.compareAtPrice && (
              <Text style={styles.originalPrice}>{item.compareAtPrice} kr</Text>
            )}
            <Text style={styles.packagePrice}>{item.price} kr</Text>
            <Text style={styles.pricePerSession}>
              {Math.round(item.price / item.sessionCount)} kr per time
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.buyButton,
              purchasing === item.id && styles.buyButtonDisabled,
            ]}
            onPress={() => handlePurchase(item)}
            disabled={purchasing === item.id}
          >
            {purchasing === item.id ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="cart-outline" size={20} color="#FFF" />
                <Text style={styles.buyButtonText}>Kjøp</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Laster PT-pakker...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={packages}
        keyExtractor={(item) => item.id}
        renderItem={renderPackage}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <>
            {/* Credits Summary */}
            {credits && (
              <View style={styles.creditsCard}>
                <View style={styles.creditsHeader}>
                  <Ionicons name="trophy-outline" size={24} color="#3B82F6" />
                  <Text style={styles.creditsTitle}>Dine PT-timer</Text>
                </View>

                <View style={styles.creditsStats}>
                  <View style={styles.creditsStat}>
                    <Text style={styles.creditsNumber}>{credits.available}</Text>
                    <Text style={styles.creditsLabel}>Tilgjengelig</Text>
                  </View>
                  <View style={styles.creditsDivider} />
                  <View style={styles.creditsStat}>
                    <Text style={styles.creditsNumber}>{credits.used}</Text>
                    <Text style={styles.creditsLabel}>Brukt</Text>
                  </View>
                  <View style={styles.creditsDivider} />
                  <View style={styles.creditsStat}>
                    <Text style={styles.creditsNumber}>{credits.total}</Text>
                    <Text style={styles.creditsLabel}>Totalt</Text>
                  </View>
                </View>

                {credits.available > 0 && (
                  <TouchableOpacity
                    style={styles.bookSessionButton}
                    onPress={() => navigation.navigate('PTBooking')}
                  >
                    <Ionicons name="calendar-outline" size={20} color="#FFF" />
                    <Text style={styles.bookSessionText}>Book PT-time</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <Text style={styles.sectionTitle}>Kjøp PT-timer</Text>
            <Text style={styles.sectionSubtitle}>
              Velg en pakke som passer deg best
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Ingen PT-pakker tilgjengelig</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  listContent: {
    padding: 16,
  },
  creditsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  creditsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  creditsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 12,
  },
  creditsStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  creditsStat: {
    alignItems: 'center',
    flex: 1,
  },
  creditsNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#3B82F6',
  },
  creditsLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  creditsDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  bookSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  bookSessionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  packageCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuredCard: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featuredText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  packageName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  discountBadge: {
    backgroundColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  discountText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  packageDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  packageDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
  },
  packageFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  originalPrice: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  packagePrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  pricePerSession: {
    fontSize: 12,
    color: '#6B7280',
  },
  buyButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buyButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  buyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
});
