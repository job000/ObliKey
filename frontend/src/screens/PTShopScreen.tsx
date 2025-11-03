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
import { useTheme } from '../contexts/ThemeContext';
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
  const { colors } = useTheme();
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
        style={[
          styles.packageCard,
          { backgroundColor: item.featured ? colors.cardBg : colors.cardBg, borderColor: item.featured ? colors.primary : colors.border },
          item.featured && styles.featuredCard
        ]}
        onPress={() => handlePurchase(item)}
        disabled={purchasing === item.id}
      >
        {item.featured && (
          <View style={[styles.featuredBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="star" size={12} color={colors.cardBg} />
            <Text style={[styles.featuredText, { color: colors.cardBg }]}>POPULÆR</Text>
          </View>
        )}

        <View style={styles.packageHeader}>
          <Text style={[styles.packageName, { color: colors.text }]}>{item.name}</Text>
          {discount > 0 && (
            <View style={[styles.discountBadge, { backgroundColor: colors.success }]}>
              <Text style={[styles.discountText, { color: colors.cardBg }]}>Spar {discount}%</Text>
            </View>
          )}
        </View>

        <Text style={[styles.packageDescription, { color: colors.textSecondary }]}>{item.description}</Text>

        <View style={styles.packageDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="fitness-outline" size={20} color={colors.primary} />
            <Text style={[styles.detailText, { color: colors.text }]}>{item.sessionCount} PT-timer</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={[styles.detailText, { color: colors.text }]}>
              Gyldig i {item.validityDays} dager
            </Text>
          </View>
        </View>

        <View style={[styles.packageFooter, { borderTopColor: colors.border }]}>
          <View>
            {item.compareAtPrice && (
              <Text style={[styles.originalPrice, { color: colors.textLight }]}>{item.compareAtPrice} kr</Text>
            )}
            <Text style={[styles.packagePrice, { color: colors.text }]}>{item.price} kr</Text>
            <Text style={[styles.pricePerSession, { color: colors.textSecondary }]}>
              {Math.round(item.price / item.sessionCount)} kr per time
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.buyButton,
              { backgroundColor: purchasing === item.id ? colors.primary + '80' : colors.primary },
            ]}
            onPress={() => handlePurchase(item)}
            disabled={purchasing === item.id}
          >
            {purchasing === item.id ? (
              <ActivityIndicator color={colors.cardBg} size="small" />
            ) : (
              <>
                <Ionicons name="cart-outline" size={20} color={colors.cardBg} />
                <Text style={[styles.buyButtonText, { color: colors.cardBg }]}>Kjøp</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Laster PT-pakker...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
              <View style={[styles.creditsCard, { backgroundColor: colors.cardBg }]}>
                <View style={styles.creditsHeader}>
                  <Ionicons name="trophy-outline" size={24} color={colors.primary} />
                  <Text style={[styles.creditsTitle, { color: colors.text }]}>Dine PT-timer</Text>
                </View>

                <View style={styles.creditsStats}>
                  <View style={styles.creditsStat}>
                    <Text style={[styles.creditsNumber, { color: colors.primary }]}>{credits.available}</Text>
                    <Text style={[styles.creditsLabel, { color: colors.textSecondary }]}>Tilgjengelig</Text>
                  </View>
                  <View style={[styles.creditsDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.creditsStat}>
                    <Text style={[styles.creditsNumber, { color: colors.primary }]}>{credits.used}</Text>
                    <Text style={[styles.creditsLabel, { color: colors.textSecondary }]}>Brukt</Text>
                  </View>
                  <View style={[styles.creditsDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.creditsStat}>
                    <Text style={[styles.creditsNumber, { color: colors.primary }]}>{credits.total}</Text>
                    <Text style={[styles.creditsLabel, { color: colors.textSecondary }]}>Totalt</Text>
                  </View>
                </View>

                {credits.available > 0 && (
                  <TouchableOpacity
                    style={[styles.bookSessionButton, { backgroundColor: colors.primary }]}
                    onPress={() => navigation.navigate('PTBooking')}
                  >
                    <Ionicons name="calendar-outline" size={20} color={colors.cardBg} />
                    <Text style={[styles.bookSessionText, { color: colors.cardBg }]}>Book PT-time</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Kjøp PT-timer</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Velg en pakke som passer deg best
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={64} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textLight }]}>Ingen PT-pakker tilgjengelig</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
  },
  creditsCard: {
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
  },
  creditsLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  creditsDivider: {
    width: 1,
    height: 40,
  },
  bookSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  bookSessionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  packageCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuredCard: {
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featuredText: {
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
    flex: 1,
  },
  discountBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  packageDescription: {
    fontSize: 14,
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
  },
  packageFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  packagePrice: {
    fontSize: 28,
    fontWeight: '700',
  },
  pricePerSession: {
    fontSize: 12,
  },
  buyButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
});
