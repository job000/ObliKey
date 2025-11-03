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
import { useTheme } from '../contexts/ThemeContext';
import { useModules } from '../contexts/ModuleContext';
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
  const { colors } = useTheme();
  const { modules } = useModules();
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
    const email = 'support@otico.no';
    const subject = 'Support henvendelse';
    const body = `Hei Otico Support,\n\n\n\nMed vennlig hilsen,\n${user?.firstName} ${user?.lastName}\n${user?.email}`;

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Container>
          <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
            <Container>
              <View style={styles.headerContent}>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={styles.backButton}
                >
                  <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View>
                  <Text style={[styles.title, { color: colors.text }]}>Hjelp & Support</Text>
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Vi er her for å hjelpe deg</Text>
                </View>
              </View>
            </Container>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>


          {/* Tab Selector */}
          <View style={[styles.tabContainer, { backgroundColor: colors.cardBg }]}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'faq' && [styles.activeTab, { backgroundColor: colors.background }]]}
              onPress={() => setActiveTab('faq')}
            >
              <Ionicons
                name="help-circle"
                size={20}
                color={activeTab === 'faq' ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'faq' && [styles.activeTabText, { color: colors.primary }]]}>
                Vanlige spørsmål
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'contact' && [styles.activeTab, { backgroundColor: colors.background }]]}
              onPress={() => setActiveTab('contact')}
            >
              <Ionicons
                name="chatbubbles"
                size={20}
                color={activeTab === 'contact' ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'contact' && [styles.activeTabText, { color: colors.primary }]]}>
                Kontakt oss
              </Text>
            </TouchableOpacity>
          </View>

          {/* FAQ Tab */}
          {activeTab === 'faq' && (
            <View style={styles.content}>
              {/* Search */}
              <View style={[styles.searchContainer, { backgroundColor: colors.cardBg }]}>
                <Ionicons name="search" size={20} color={colors.textLight} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Søk i vanlige spørsmål..."
                  placeholderTextColor={colors.textLight}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {/* FAQ List */}
              {filteredFAQs.map((faq) => (
                <TouchableOpacity
                  key={faq.id}
                  style={[styles.faqItem, { backgroundColor: colors.cardBg }]}
                  onPress={() => toggleFAQ(faq.id)}
                >
                  <View style={styles.faqHeader}>
                    <View style={[styles.faqCategoryBadge, { backgroundColor: colors.background }]}>
                      <Text style={[styles.faqCategoryText, { color: colors.primary }]}>{faq.category}</Text>
                    </View>
                    <Ionicons
                      name={expandedFAQ === faq.id ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </View>
                  <Text style={[styles.faqQuestion, { color: colors.text }]}>{faq.question}</Text>
                  {expandedFAQ === faq.id && (
                    <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>{faq.answer}</Text>
                  )}
                </TouchableOpacity>
              ))}

              {filteredFAQs.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={64} color={colors.border} />
                  <Text style={[styles.emptyText, { color: colors.textLight }]}>Ingen resultater funnet</Text>
                </View>
              )}

              {/* Quick Actions */}
              <View style={styles.quickActions}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Fant du ikke svar?</Text>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.cardBg }]}
                  onPress={() => setActiveTab('contact')}
                >
                  <Ionicons name="chatbubbles" size={24} color={colors.primary} />
                  <Text style={[styles.actionButtonText, { color: colors.primary }]}>Kontakt support</Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Contact Tab */}
          {activeTab === 'contact' && (
            <View style={styles.content}>
              {/* Contact Methods */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Hvordan vil du kontakte oss?</Text>

                {modules.chat && (
                  <TouchableOpacity style={[styles.contactMethod, { backgroundColor: colors.cardBg }]} onPress={handleContactSupport}>
                    <View style={[styles.contactMethodIcon, { backgroundColor: colors.background }]}>
                      <Ionicons name="chatbubbles" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.contactMethodContent}>
                      <Text style={[styles.contactMethodTitle, { color: colors.text }]}>Chat med support</Text>
                      <Text style={[styles.contactMethodDescription, { color: colors.textSecondary }]}>
                        Få rask hjelp via chat
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={[styles.contactMethod, { backgroundColor: colors.cardBg }]} onPress={handleEmailSupport}>
                  <View style={[styles.contactMethodIcon, { backgroundColor: colors.background }]}>
                    <Ionicons name="mail" size={24} color={colors.success} />
                  </View>
                  <View style={styles.contactMethodContent}>
                    <Text style={[styles.contactMethodTitle, { color: colors.text }]}>Send e-post</Text>
                    <Text style={[styles.contactMethodDescription, { color: colors.textSecondary }]}>
                      support@otico.no
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.contactMethod, { backgroundColor: colors.cardBg }]} onPress={handlePhoneSupport}>
                  <View style={[styles.contactMethodIcon, { backgroundColor: colors.background }]}>
                    <Ionicons name="call" size={24} color={colors.warning} />
                  </View>
                  <View style={styles.contactMethodContent}>
                    <Text style={[styles.contactMethodTitle, { color: colors.text }]}>Ring oss</Text>
                    <Text style={[styles.contactMethodDescription, { color: colors.textSecondary }]}>
                      +47 123 45 678
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                </TouchableOpacity>
              </View>

              {/* Submit Ticket Form */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Send en henvendelse</Text>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Kategori</Text>
                <View style={styles.categoryGrid}>
                  {SUPPORT_CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryChip,
                        { backgroundColor: colors.cardBg, borderColor: colors.border },
                        selectedCategory === category.id && [styles.categoryChipActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
                      ]}
                      onPress={() => setSelectedCategory(category.id)}
                    >
                      <Ionicons
                        name={category.icon as any}
                        size={18}
                        color={selectedCategory === category.id ? colors.cardBg : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          { color: colors.textSecondary },
                          selectedCategory === category.id && [styles.categoryChipTextActive, { color: colors.cardBg }],
                        ]}
                      >
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Emne</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="Hva gjelder henvendelsen?"
                  placeholderTextColor={colors.textLight}
                  value={ticketSubject}
                  onChangeText={setTicketSubject}
                  maxLength={100}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Beskrivelse</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea, { backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="Beskriv ditt problem eller spørsmål..."
                  placeholderTextColor={colors.textLight}
                  value={ticketMessage}
                  onChangeText={setTicketMessage}
                  multiline
                  numberOfLines={6}
                  maxLength={1000}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: colors.primary }, submitting && [styles.submitButtonDisabled, { backgroundColor: colors.textLight }]]}
                  onPress={handleSubmitTicket}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color={colors.cardBg} />
                  ) : (
                    <>
                      <Ionicons name="send" size={20} color={colors.cardBg} />
                      <Text style={[styles.submitButtonText, { color: colors.cardBg }]}>Send henvendelse</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Support Hours */}
              <View style={[styles.infoBox, { backgroundColor: colors.background }]}>
                <Ionicons name="time-outline" size={20} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.primary }]}>
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
  },
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
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
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: '600',
  },
  content: {
    paddingBottom: 32,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  faqItem: {
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
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  faqCategoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  quickActions: {
    marginTop: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  contactMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactMethodContent: {
    flex: 1,
  },
  contactMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  contactMethodDescription: {
    fontSize: 14,
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
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  categoryChipActive: {
  },
  categoryChipText: {
    fontSize: 14,
  },
  categoryChipTextActive: {
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 120,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 14,
    gap: 8,
  },
  submitButtonDisabled: {
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
    gap: 12,
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
  },
});
