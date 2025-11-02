import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../services/api';
import { ExerciseMedia } from '../../types/workout';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface ExerciseMediaGalleryProps {
  exerciseId: string;
  exerciseType: 'system' | 'custom';
  exerciseName: string;
  canEdit?: boolean;
  onClose?: () => void;
}

const COLORS = {
  primary: '#8B9BDE',
  success: '#10B981',
  danger: '#EF4444',
  text: '#111827',
  textSecondary: '#6B7280',
  background: '#F9FAFB',
  cardBg: '#FFFFFF',
  border: '#E5E7EB',
  shadow: '#000000',
};

export const ExerciseMediaGallery: React.FC<ExerciseMediaGalleryProps> = ({
  exerciseId,
  exerciseType,
  exerciseName,
  canEdit: canEditProp,
  onClose,
}) => {
  const { user } = useAuth();
  const [media, setMedia] = useState<ExerciseMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<ExerciseMedia | null>(null);
  const [showFullScreen, setShowFullScreen] = useState(false);

  // Form state
  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('file');
  const [mediaUrl, setMediaUrl] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaDescription, setMediaDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Check if user can edit - use prop if provided, otherwise default logic
  const canEdit = canEditProp !== undefined
    ? canEditProp
    : (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN');

  useEffect(() => {
    loadMedia();
  }, [exerciseId]);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const response = await api.getExerciseMedia(exerciseId, exerciseType);
      if (response.success) {
        setMedia(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load media:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Tillatelse nødvendig', 'Vi trenger tilgang til bildene dine for å laste opp media.');
        return;
      }

      // Let user pick image or video
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        // Auto-detect media type from the selected asset
        if (result.assets[0].type === 'video') {
          setMediaType('VIDEO');
        } else {
          setMediaType('IMAGE');
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Feil', 'Kunne ikke velge bilde/video');
    }
  };

  const takePhoto = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Tillatelse nødvendig', 'Vi trenger tilgang til kameraet ditt for å ta bilder.');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setMediaType('IMAGE');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Feil', 'Kunne ikke ta bilde');
    }
  };

  const handleAddMedia = async () => {
    // Validate based on upload method
    if (uploadMethod === 'url' && !mediaUrl.trim()) {
      Alert.alert('Feil', 'Vennligst legg inn en URL');
      return;
    }

    if (uploadMethod === 'file' && !selectedImage) {
      Alert.alert('Feil', 'Vennligst velg et bilde eller video');
      return;
    }

    try {
      setIsUploading(true);
      let response;

      if (uploadMethod === 'file' && selectedImage) {
        // Upload file
        response = await api.uploadExerciseMediaFile(exerciseId, selectedImage, {
          exerciseType,
          title: mediaTitle || undefined,
          description: mediaDescription || undefined,
          sortOrder: media.length,
        });
      } else {
        // Use URL
        response = await api.addExerciseMedia(exerciseId, {
          url: mediaUrl,
          mediaType,
          title: mediaTitle || undefined,
          description: mediaDescription || undefined,
          sortOrder: media.length,
          exerciseType,
        });
      }

      if (response.success) {
        setMedia([...media, response.data]);
        setShowAddModal(false);
        resetForm();
        Alert.alert('Suksess', 'Media lagt til');
      }
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.error || 'Kunne ikke legge til media');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    Alert.alert(
      'Bekreft sletting',
      'Er du sikker på at du vil slette denne mediafilen?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.deleteExerciseMedia(exerciseId, mediaId);
              if (response.success) {
                setMedia(media.filter(m => m.id !== mediaId));
                Alert.alert('Suksess', 'Media slettet');
              }
            } catch (error: any) {
              Alert.alert('Feil', error.response?.data?.error || 'Kunne ikke slette media');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setUploadMethod('file');
    setMediaUrl('');
    setSelectedImage(null);
    setMediaType('IMAGE');
    setMediaTitle('');
    setMediaDescription('');
  };

  const openFullScreen = (item: ExerciseMedia) => {
    setSelectedMedia(item);
    setShowFullScreen(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Media - {exerciseName}</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={COLORS.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Media Grid */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {media.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>Ingen bilder eller videoer ennå</Text>
            {canEdit && (
              <Text style={styles.emptySubtext}>
                Trykk på + for å legge til media
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.mediaGrid}>
            {media.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.mediaItem}
                onPress={() => openFullScreen(item)}
                activeOpacity={0.8}
              >
                {item.mediaType === 'IMAGE' ? (
                  <Image source={{ uri: item.url }} style={styles.mediaImage} resizeMode="cover" />
                ) : (
                  <View style={styles.videoPlaceholder}>
                    <Ionicons name="play-circle" size={48} color={COLORS.primary} />
                  </View>
                )}
                {item.title && (
                  <View style={styles.mediaOverlay}>
                    <Text style={styles.mediaTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                  </View>
                )}
                {canEdit && !item.isLegacy && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteMedia(item.id)}
                  >
                    <Ionicons name="trash" size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Button */}
      {canEdit && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* Add Media Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Legg til media</Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Upload Method Selector */}
              <Text style={styles.label}>Opplastingsmetode</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[styles.typeButton, uploadMethod === 'file' && styles.typeButtonActive]}
                  onPress={() => setUploadMethod('file')}
                >
                  <Ionicons
                    name="cloud-upload"
                    size={20}
                    color={uploadMethod === 'file' ? '#FFF' : COLORS.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      uploadMethod === 'file' && styles.typeButtonTextActive,
                    ]}
                  >
                    Last opp fil
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, uploadMethod === 'url' && styles.typeButtonActive]}
                  onPress={() => setUploadMethod('url')}
                >
                  <Ionicons
                    name="link"
                    size={20}
                    color={uploadMethod === 'url' ? '#FFF' : COLORS.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      uploadMethod === 'url' && styles.typeButtonTextActive,
                    ]}
                  >
                    URL
                  </Text>
                </TouchableOpacity>
              </View>

              {/* File Upload Section */}
              {uploadMethod === 'file' && (
                <>
                  <Text style={styles.label}>Velg fil</Text>
                  <View style={styles.filePickerContainer}>
                    <TouchableOpacity
                      style={styles.filePickerButton}
                      onPress={pickImage}
                    >
                      <Ionicons name="images" size={24} color={COLORS.primary} />
                      <Text style={styles.filePickerButtonText}>Velg fra bibliotek</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.filePickerButton}
                      onPress={takePhoto}
                    >
                      <Ionicons name="camera" size={24} color={COLORS.primary} />
                      <Text style={styles.filePickerButtonText}>Ta bilde</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Image Preview */}
                  {selectedImage && (
                    <View style={styles.imagePreviewContainer}>
                      <Image
                        source={{ uri: selectedImage }}
                        style={styles.imagePreview}
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => setSelectedImage(null)}
                      >
                        <Ionicons name="close-circle" size={28} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              {/* URL Section */}
              {uploadMethod === 'url' && (
                <>
                  {/* Media Type */}
                  <Text style={styles.label}>Type</Text>
                  <View style={styles.typeSelector}>
                    <TouchableOpacity
                      style={[styles.typeButton, mediaType === 'IMAGE' && styles.typeButtonActive]}
                      onPress={() => setMediaType('IMAGE')}
                    >
                      <Ionicons
                        name="image"
                        size={20}
                        color={mediaType === 'IMAGE' ? '#FFF' : COLORS.textSecondary}
                      />
                      <Text
                        style={[
                          styles.typeButtonText,
                          mediaType === 'IMAGE' && styles.typeButtonTextActive,
                        ]}
                      >
                        Bilde
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.typeButton, mediaType === 'VIDEO' && styles.typeButtonActive]}
                      onPress={() => setMediaType('VIDEO')}
                    >
                      <Ionicons
                        name="videocam"
                        size={20}
                        color={mediaType === 'VIDEO' ? '#FFF' : COLORS.textSecondary}
                      />
                      <Text
                        style={[
                          styles.typeButtonText,
                          mediaType === 'VIDEO' && styles.typeButtonTextActive,
                        ]}
                      >
                        Video
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* URL */}
                  <Text style={styles.label}>URL *</Text>
                  <TextInput
                    style={styles.input}
                    value={mediaUrl}
                    onChangeText={setMediaUrl}
                    placeholder="https://..."
                    placeholderTextColor={COLORS.textSecondary}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </>
              )}

              {/* Title */}
              <Text style={styles.label}>Tittel (valgfritt)</Text>
              <TextInput
                style={styles.input}
                value={mediaTitle}
                onChangeText={setMediaTitle}
                placeholder="F.eks. 'Start posisjon'"
                placeholderTextColor={COLORS.textSecondary}
              />

              {/* Description */}
              <Text style={styles.label}>Beskrivelse (valgfritt)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={mediaDescription}
                onChangeText={setMediaDescription}
                placeholder="Beskrivelse av bildet/videoen"
                placeholderTextColor={COLORS.textSecondary}
                multiline
                numberOfLines={3}
              />

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveButton, isUploading && styles.saveButtonDisabled]}
                onPress={handleAddMedia}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Legg til</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Full Screen Modal */}
      <Modal visible={showFullScreen} animationType="fade" transparent>
        <View style={styles.fullScreenOverlay}>
          <TouchableOpacity
            style={styles.fullScreenClose}
            onPress={() => setShowFullScreen(false)}
          >
            <Ionicons name="close" size={32} color="#FFF" />
          </TouchableOpacity>
          {selectedMedia && (
            <View style={styles.fullScreenContent}>
              {selectedMedia.mediaType === 'IMAGE' ? (
                <Image
                  source={{ uri: selectedMedia.url }}
                  style={styles.fullScreenImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.videoPlaceholderLarge}>
                  <Ionicons name="play-circle" size={80} color="#FFF" />
                  <Text style={styles.videoText}>Video vil bli vist her</Text>
                </View>
              )}
              {(selectedMedia.title || selectedMedia.description) && (
                <View style={styles.fullScreenInfo}>
                  {selectedMedia.title && (
                    <Text style={styles.fullScreenTitle}>{selectedMedia.title}</Text>
                  )}
                  {selectedMedia.description && (
                    <Text style={styles.fullScreenDescription}>
                      {selectedMedia.description}
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mediaItem: {
    width: (width - 48) / 2,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.cardBg,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.border,
  },
  mediaOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
  },
  mediaTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalContent: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  typeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  typeButtonTextActive: {
    color: '#FFF',
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },

  // Full screen modal
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  fullScreenClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 22,
  },
  fullScreenContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullScreenImage: {
    width: '100%',
    height: '80%',
  },
  videoPlaceholderLarge: {
    width: '100%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoText: {
    fontSize: 16,
    color: '#FFF',
    marginTop: 16,
  },
  fullScreenInfo: {
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    maxWidth: '100%',
  },
  fullScreenTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
  },
  fullScreenDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },

  // File picker styles
  filePickerContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  filePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  filePickerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 16,
    backgroundColor: COLORS.border,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
});
