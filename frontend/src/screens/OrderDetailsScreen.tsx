import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import Container from '../components/Container';
import type { Order } from '../types';

interface ReviewModalData {
  productId: string;
  productName: string;
}

export default function OrderDetailsScreen({ navigation, route }: any) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewProduct, setReviewProduct] = useState<ReviewModalData | null>(null);
  const [newReview, setNewReview] = useState({ rating: 5, title: '', comment: '' });

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await api.getOrder(orderId);
      if (response.success) {
        setOrder(response.data);
      }
    } catch (error) {
      console.error('Failed to load order details:', error);
    } finally {
      setLoading(false);
    }
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

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return '#F59E0B';
      case 'PROCESSING':
        return '#3B82F6';
      case 'SHIPPED':
        return '#8B5CF6';
      case 'DELIVERED':
        return '#10B981';
      case 'CANCELLED':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'Venter';
      case 'PROCESSING':
        return 'Behandles';
      case 'SHIPPED':
        return 'Sendt';
      case 'DELIVERED':
        return 'Levert';
      case 'CANCELLED':
        return 'Kansellert';
      default:
        return status;
    }
  };

  const openReviewModal = (productId: string, productName: string) => {
    setReviewProduct({ productId, productName });
    setNewReview({ rating: 5, title: '', comment: '' });
    setShowReviewModal(true);
  };

  const closeReviewModal = () => {
    setShowReviewModal(false);
    setReviewProduct(null);
    setNewReview({ rating: 5, title: '', comment: '' });
  };

  const submitReview = async () => {
    if (!reviewProduct) return;

    if (!newReview.comment || newReview.comment.trim().length < 10) {
      Alert.alert('Feil', 'Kommentar må være minst 10 tegn');
      return;
    }

    try {
      await api.createReview({
        productId: reviewProduct.productId,
        rating: newReview.rating,
        title: newReview.title,
        comment: newReview.comment,
      });

      Alert.alert('Suksess', 'Takk for din anmeldelse! Den vil bli gjennomgått før publisering.');
      closeReviewModal();
    } catch (error: any) {
      if (error?.response?.status === 403) {
        Alert.alert('Feil', 'Anmeldelser er ikke aktivert for denne butikken');
      } else if (error?.response?.status === 400) {
        Alert.alert('Feil', error.response?.data?.message || 'Du har allerede anmeldt dette produktet');
      } else {
        console.error('Failed to create review:', error);
        Alert.alert('Feil', 'Kunne ikke sende anmeldelse. Prøv igjen senere.');
      }
    }
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

  if (!order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>Kunne ikke laste ordredetaljer</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Gå tilbake</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screenHeader}>
        <Container>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.headerBackButton}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Ordredetaljer</Text>
          </View>
        </Container>
      </View>

      <ScrollView style={styles.container}>
        <Container>
          {/* Order Header */}
          <View style={styles.orderHeader}>
            <View style={styles.orderHeaderInfo}>
              <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
              <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(order.status) + '20' },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(order.status) },
                ]}
              >
                {getStatusText(order.status)}
              </Text>
            </View>
          </View>

          {/* Order Items */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bestilte varer</Text>
            <View style={styles.itemsCard}>
              {order.items.map((item, index) => (
                <View
                  key={index}
                  style={[
                    styles.itemRow,
                    index === order.items.length - 1 && styles.itemRowLast,
                  ]}
                >
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.productName}</Text>
                    <Text style={styles.itemMeta}>
                      {item.quantity} x {item.price.toLocaleString('nb-NO')} kr
                    </Text>
                    {order.status.toUpperCase() === 'DELIVERED' && (
                      <TouchableOpacity
                        style={styles.reviewButton}
                        onPress={() => openReviewModal(item.productId, item.productName)}
                      >
                        <Ionicons name="star-outline" size={16} color="#3B82F6" />
                        <Text style={styles.reviewButtonText}>Skriv anmeldelse</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.itemPrice}>
                    {item.subtotal.toLocaleString('nb-NO')} kr
                  </Text>
                </View>
              ))}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalAmount}>
                  {order.total.toLocaleString('nb-NO')} kr
                </Text>
              </View>
            </View>
          </View>

          {/* Customer Info */}
          {order.user && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kundeinformasjon</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={20} color="#6B7280" />
                  <Text style={styles.infoText}>
                    {order.user.firstName} {order.user.lastName}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="mail-outline" size={20} color="#6B7280" />
                  <Text style={styles.infoText}>{order.user.email}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Order Timeline */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ordrestatus</Text>
            <View style={styles.timelineCard}>
              <View style={styles.timelineItem}>
                <View
                  style={[
                    styles.timelineDot,
                    { backgroundColor: '#10B981' },
                  ]}
                />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Ordre mottatt</Text>
                  <Text style={styles.timelineDate}>
                    {formatDate(order.createdAt)}
                  </Text>
                </View>
              </View>

              {order.status !== 'PENDING' && (
                <>
                  <View style={styles.timelineLine} />
                  <View style={styles.timelineItem}>
                    <View
                      style={[
                        styles.timelineDot,
                        { backgroundColor: '#3B82F6' },
                      ]}
                    />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineTitle}>Under behandling</Text>
                      <Text style={styles.timelineDate}>
                        {order.status === 'PROCESSING' ||
                        order.status === 'SHIPPED' ||
                        order.status === 'DELIVERED'
                          ? formatDate(order.createdAt)
                          : '—'}
                      </Text>
                    </View>
                  </View>
                </>
              )}

              {(order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
                <>
                  <View style={styles.timelineLine} />
                  <View style={styles.timelineItem}>
                    <View
                      style={[
                        styles.timelineDot,
                        { backgroundColor: '#8B5CF6' },
                      ]}
                    />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineTitle}>Sendt</Text>
                      <Text style={styles.timelineDate}>
                        {order.status === 'SHIPPED' || order.status === 'DELIVERED'
                          ? formatDate(order.createdAt)
                          : '—'}
                      </Text>
                    </View>
                  </View>
                </>
              )}

              {order.status === 'DELIVERED' && (
                <>
                  <View style={styles.timelineLine} />
                  <View style={styles.timelineItem}>
                    <View
                      style={[
                        styles.timelineDot,
                        { backgroundColor: '#10B981' },
                      ]}
                    />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineTitle}>Levert</Text>
                      <Text style={styles.timelineDate}>
                        {formatDate(order.createdAt)}
                      </Text>
                    </View>
                  </View>
                </>
              )}

              {order.status === 'CANCELLED' && (
                <>
                  <View style={styles.timelineLine} />
                  <View style={styles.timelineItem}>
                    <View
                      style={[
                        styles.timelineDot,
                        { backgroundColor: '#EF4444' },
                      ]}
                    />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineTitle}>Kansellert</Text>
                      <Text style={styles.timelineDate}>
                        {formatDate(order.createdAt)}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>
        </Container>
      </ScrollView>

      {/* Write Review Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeReviewModal}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.reviewModalOverlay}
        >
          <TouchableOpacity
            style={styles.reviewModalBackdrop}
            activeOpacity={1}
            onPress={closeReviewModal}
          />
          <View style={styles.reviewModalContent}>
            <View style={styles.reviewModalHeader}>
              <Text style={styles.reviewModalTitle}>
                Anmeld {reviewProduct?.productName}
              </Text>
              <TouchableOpacity onPress={closeReviewModal}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.reviewModalScroll}
              contentContainerStyle={styles.reviewModalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.reviewModalLabel}>Rating:</Text>
              <View style={styles.ratingSelector}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setNewReview({ ...newReview, rating: star })}
                    style={styles.starButton}
                  >
                    <Ionicons
                      name={star <= newReview.rating ? 'star' : 'star-outline'}
                      size={36}
                      color={star <= newReview.rating ? '#EAB308' : '#D1D5DB'}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.reviewModalLabel}>Tittel (valgfritt):</Text>
              <TextInput
                style={styles.reviewInput}
                placeholder="Tittel på anmeldelsen..."
                value={newReview.title}
                onChangeText={(text) => setNewReview({ ...newReview, title: text })}
              />

              <Text style={styles.reviewModalLabel}>Kommentar:</Text>
              <TextInput
                style={[styles.reviewInput, styles.reviewTextArea]}
                placeholder="Del din erfaring med produktet..."
                value={newReview.comment}
                onChangeText={(text) => setNewReview({ ...newReview, comment: text })}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <TouchableOpacity style={styles.submitReviewButton} onPress={submitReview}>
                <Text style={styles.submitReviewText}>Send inn anmeldelse</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  headerBackButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  orderHeaderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  itemsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemRowLast: {
    borderBottomWidth: 0,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 14,
    color: '#6B7280',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#374151',
  },
  timelineCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 12,
  },
  timelineLine: {
    width: 2,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginLeft: 5,
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  reviewButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
  },
  // Review Modal Styles
  reviewModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  reviewModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  reviewModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
  },
  reviewModalScroll: {
    maxHeight: '100%',
  },
  reviewModalScrollContent: {
    paddingBottom: 20,
  },
  reviewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  reviewModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  reviewModalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  ratingSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  starButton: {
    padding: 4,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#FFF',
  },
  reviewTextArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  submitReviewButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  submitReviewText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
