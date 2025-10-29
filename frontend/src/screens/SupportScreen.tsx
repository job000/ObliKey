import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import Container from '../components/Container';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface SupportTicket {
  subject: string;
  message: string;
  category: string;
}

const FAQS: FAQ[] = [
  {
    id: '1',
    question: 'Hvordan bestiller jeg produkter?',
    answer: 'Gå til Butikk-fanen, velg produkter du ønsker, legg til i handlekurv, og fullfør bestillingen ved å gå til handlekurven og trykke på "Gå til kasse".',
    category: 'Butikk',
  },
  {
    id: '2',
    question: 'Hvordan booker jeg en PT-økt?',
    answer: 'Gå til PT-Økter-fanen og trykk på "Book ny økt". Velg ønsket trener, dato og tidspunkt, deretter bekreft bookingen.',
    category: 'PT-Økter',
  },
  {
    id: '3',
    question: 'Hvordan melder jeg meg på en gruppetime?',
    answer: 'Gå til Klasser-fanen, finn klassen du ønsker å delta på, og trykk på "Meld deg på". Du vil motta en bekreftelse når bookingen er fullført.',
    category: 'Klasser',
  },
  {
    id: '4',
    question: 'Hvordan endrer jeg profilinformasjonen min?',
    answer: 'Gå til Profil-fanen og trykk på "Rediger profil". Her kan du oppdatere navn, e-post, telefon og profilbilde.',
    category: 'Profil',
  },
  {
    id: '5',
    question: 'Hvordan kontakter jeg en trener?',
    answer: 'Du kan sende melding til trenere via Chat-fanen. Velg samtale med ønsket trener eller start en ny samtale.',
    category: 'Chat',
  },
  {
    id: '6',
    question: 'Hvordan avbestiller jeg en booking?',
    answer: 'Gå til dine bookinger i PT-Økter eller Klasser, finn bookingen du ønsker å avbestille, og trykk på "Avbestill". Merk at avbestillingsregler kan variere.',
    category: 'Bookinger',
  },
  {
    id: '7',
    question: 'Hvordan ser jeg min treningshistorikk?',
    answer: 'Din treningshistorikk og fullførte økter finner du i PT-Økter-fanen under "Historikk" eller i Treningsprogrammer.',
    category: 'Trening',
  },
  {
    id: '8',
    question: 'Hva gjør jeg hvis jeg har glemt passordet mitt?',
    answer: 'På innloggingsskjermen, trykk på "Glemt passord?" og følg instruksjonene for å tilbakestille passordet ditt via e-post.',
    category: 'Konto',
  },
];

const SUPPORT_CATEGORIES = [
  { id: 'account', label: 'Konto & Innlogging', icon: 'person' },
  { id: 'booking', label: 'Bookinger', icon: 'calendar' },
  { id: 'payment', label: 'Betaling & Faktura', icon: 'card' },
  { id: 'technical', label: 'Teknisk problem', icon: 'construct' },
  { id: 'other', label: 'Annet', icon: 'help-circle' },
];

export default function SupportScreen({ navigation }: any) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'faq' | 'contact'>('faq');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredFAQs = FAQS.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const handleContactSupport = () => {
    // Navigate to chat with support
    navigation.navigate('Chat', { conversationId: 'support' });
  };

  const handleEmailSupport = async () => {
    const email = 'support@oblikey.no';
    const subject = 'Support henvendelse';
    const body = `Hei ObliKey Support,\n\n\n\nMed vennlig hilsen,\n${user?.firstName} ${user?.lastName}\n${user?.email}`;

    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Feil', 'Kunne ikke åpne e-postklient');
      }
    } catch (error) {
      Alert.alert('Feil', 'Kunne ikke åpne e-postklient');
    }
  };

  const handlePhoneSupport = async () => {
    const phone = '+4712345678'; // Replace with actual support phone
    const url = `tel:${phone}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Feil', 'Kunne ikke ringe');
      }
    } catch (error) {
      Alert.alert('Feil', 'Kunne ikke ringe');
    }
  };

  const handleSubmitTicket = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim() || !selectedCategory) {
      Alert.alert('Mangler informasjon', 'Vennligst fyll ut alle feltene');
      return;
    }

    try {
      setSubmitting(true);

      // Create a support ticket via chat message to support
      const ticketData: SupportTicket = {
        subject: ticketSubject,
        message: ticketMessage,
        category: selectedCategory,
      };

      // For now, we'll use the chat API to send to support
      // In a real implementation, you'd have a dedicated support ticket endpoint
      const message = `**${ticketData.category}**: ${ticketData.subject}\n\n${ticketData.message}`;

      // This would create a new conversation with support
      // await api.createSupportTicket(ticketData);

      Alert.alert(
        'Henvendelse sendt',
        'Vi har mottatt din henvendelse og vil svare deg så snart som mulig via e-post eller chat.',
        [
          {
            text: 'OK',
            onPress: () => {
              setTicketSubject('');
              setTicketMessage('');
              setSelectedCategory('');
              setActiveTab('faq');
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Feil', 'Kunne ikke sende henvendelsen. Vennligst prøv igjen.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Container>
          <View style={styles.header}>
            <Container>
              <View style={styles.headerContent}>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={styles.backButton}
                >
                  <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <View>
                  <Text style={styles.title}>Hjelp & Support</Text>
                  <Text style={styles.subtitle}>Vi er her for å hjelpe deg</Text>
                </View>
              </View>
            </Container>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>


          {/* Tab Selector */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'faq' && styles.activeTab]}
              onPress={() => setActiveTab('faq')}
            >
              <Ionicons
                name="help-circle"
                size={20}
                color={activeTab === 'faq' ? '#3B82F6' : '#6B7280'}
              />
              <Text style={[styles.tabText, activeTab === 'faq' && styles.activeTabText]}>
                Vanlige spørsmål
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'contact' && styles.activeTab]}
              onPress={() => setActiveTab('contact')}
            >
              <Ionicons
                name="chatbubbles"
                size={20}
                color={activeTab === 'contact' ? '#3B82F6' : '#6B7280'}
              />
              <Text style={[styles.tabText, activeTab === 'contact' && styles.activeTabText]}>
                Kontakt oss
              </Text>
            </TouchableOpacity>
          </View>

          {/* FAQ Tab */}
          {activeTab === 'faq' && (
            <View style={styles.content}>
              {/* Search */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Søk i vanlige spørsmål..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {/* FAQ List */}
              {filteredFAQs.map((faq) => (
                <TouchableOpacity
                  key={faq.id}
                  style={styles.faqItem}
                  onPress={() => toggleFAQ(faq.id)}
                >
                  <View style={styles.faqHeader}>
                    <View style={styles.faqCategoryBadge}>
                      <Text style={styles.faqCategoryText}>{faq.category}</Text>
                    </View>
                    <Ionicons
                      name={expandedFAQ === faq.id ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#6B7280"
                    />
                  </View>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  {expandedFAQ === faq.id && (
                    <Text style={styles.faqAnswer}>{faq.answer}</Text>
                  )}
                </TouchableOpacity>
              ))}

              {filteredFAQs.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyText}>Ingen resultater funnet</Text>
                </View>
              )}

              {/* Quick Actions */}
              <View style={styles.quickActions}>
                <Text style={styles.sectionTitle}>Fant du ikke svar?</Text>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setActiveTab('contact')}
                >
                  <Ionicons name="chatbubbles" size={24} color="#3B82F6" />
                  <Text style={styles.actionButtonText}>Kontakt support</Text>
                  <Ionicons name="arrow-forward" size={20} color="#3B82F6" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Contact Tab */}
          {activeTab === 'contact' && (
            <View style={styles.content}>
              {/* Contact Methods */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Hvordan vil du kontakte oss?</Text>

                <TouchableOpacity style={styles.contactMethod} onPress={handleContactSupport}>
                  <View style={styles.contactMethodIcon}>
                    <Ionicons name="chatbubbles" size={24} color="#3B82F6" />
                  </View>
                  <View style={styles.contactMethodContent}>
                    <Text style={styles.contactMethodTitle}>Chat med support</Text>
                    <Text style={styles.contactMethodDescription}>
                      Få rask hjelp via chat
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.contactMethod} onPress={handleEmailSupport}>
                  <View style={styles.contactMethodIcon}>
                    <Ionicons name="mail" size={24} color="#10B981" />
                  </View>
                  <View style={styles.contactMethodContent}>
                    <Text style={styles.contactMethodTitle}>Send e-post</Text>
                    <Text style={styles.contactMethodDescription}>
                      support@oblikey.no
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.contactMethod} onPress={handlePhoneSupport}>
                  <View style={styles.contactMethodIcon}>
                    <Ionicons name="call" size={24} color="#F59E0B" />
                  </View>
                  <View style={styles.contactMethodContent}>
                    <Text style={styles.contactMethodTitle}>Ring oss</Text>
                    <Text style={styles.contactMethodDescription}>
                      +47 123 45 678
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {/* Submit Ticket Form */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Send en henvendelse</Text>

                <Text style={styles.inputLabel}>Kategori</Text>
                <View style={styles.categoryGrid}>
                  {SUPPORT_CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryChip,
                        selectedCategory === category.id && styles.categoryChipActive,
                      ]}
                      onPress={() => setSelectedCategory(category.id)}
                    >
                      <Ionicons
                        name={category.icon as any}
                        size={18}
                        color={selectedCategory === category.id ? '#FFF' : '#6B7280'}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          selectedCategory === category.id && styles.categoryChipTextActive,
                        ]}
                      >
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Emne</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Hva gjelder henvendelsen?"
                  value={ticketSubject}
                  onChangeText={setTicketSubject}
                  maxLength={100}
                />

                <Text style={styles.inputLabel}>Beskrivelse</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Beskriv ditt problem eller spørsmål..."
                  value={ticketMessage}
                  onChangeText={setTicketMessage}
                  multiline
                  numberOfLines={6}
                  maxLength={1000}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleSubmitTicket}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="send" size={20} color="#FFF" />
                      <Text style={styles.submitButtonText}>Send henvendelse</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Support Hours */}
              <View style={styles.infoBox}>
                <Ionicons name="time-outline" size={20} color="#3B82F6" />
                <Text style={styles.infoText}>
                  Vår support er tilgjengelig man-fre 08:00-16:00
                </Text>
              </View>
            </View>
          )}
          </ScrollView>
        </Container>
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
  header: {
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#EFF6FF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  content: {
    paddingBottom: 32,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  faqItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  faqCategoryBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  faqCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginTop: 8,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  quickActions: {
    marginTop: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  contactMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactMethodContent: {
    flex: 1,
  },
  contactMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  contactMethodDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#6B7280',
  },
  categoryChipTextActive: {
    color: '#FFF',
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 120,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 14,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    gap: 12,
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
  },
});
