import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import Layout from '../../components/Layout';
import {
  Eye,
  EyeOff,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Globe,
  ArrowUp,
  ArrowDown,
  Smartphone,
  Monitor,
  Check
} from 'lucide-react';

type Section = 'HERO' | 'FEATURES' | 'CTA' | 'ABOUT' | 'NEWS' | 'FOOTER';
type PreviewMode = 'desktop' | 'mobile';

interface LandingPageContent {
  id?: string;
  section: Section;
  title?: string;
  subtitle?: string;
  content?: string;
  imageUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
  sortOrder: number;
  active: boolean;
  published?: boolean;
}

export default function LandingPageCMS() {
  const [content, setContent] = useState<LandingPageContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<LandingPageContent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [isDraft, setIsDraft] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const response = await api.getAllLandingPageContent();
      if (response.success) {
        setContent(response.data);
      }
    } catch (error) {
      console.error('Failed to load content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;

    try {
      if (editing.id) {
        await api.updateLandingPageContent(editing.id, editing);
        alert('Innhold oppdatert! Gå til landingssiden (klikk på logoen) for å se endringene.');
      } else {
        await api.createLandingPageContent(editing);
        alert('Innhold opprettet! Gå til landingssiden (klikk på logoen) for å se endringene.');
      }
      setShowForm(false);
      setEditing(null);
      loadContent();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Feil ved lagring');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Er du sikker på at du vil slette dette innholdet?')) return;
    try {
      await api.deleteLandingPageContent(id);
      alert('Slettet!');
      loadContent();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Kunne ikke slette');
    }
  };

  const handleTogglePublish = async (item: LandingPageContent) => {
    try {
      await api.updateLandingPageContent(item.id!, {
        ...item,
        active: !item.active
      });
      loadContent();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Kunne ikke endre publiseringsstatus');
    }
  };

  const handleMove = async (item: LandingPageContent, direction: 'up' | 'down') => {
    const sectionContent = content
      .filter(c => c.section === item.section)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const currentIndex = sectionContent.findIndex(c => c.id === item.id);
    if (currentIndex === -1) return;

    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === sectionContent.length - 1) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const swapItem = sectionContent[swapIndex];

    try {
      await Promise.all([
        api.updateLandingPageContent(item.id!, { ...item, sortOrder: swapItem.sortOrder }),
        api.updateLandingPageContent(swapItem.id!, { ...swapItem, sortOrder: item.sortOrder })
      ]);
      loadContent();
    } catch (error) {
      alert('Kunne ikke flytte innhold');
    }
  };

  const handleInit = async () => {
    try {
      await api.initializeDefaultLandingPageContent();
      alert('Standard innhold opprettet!');
      loadContent();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Feil');
    }
  };

  const groupedContent = content.reduce((acc: Record<Section, LandingPageContent[]>, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {} as Record<Section, LandingPageContent[]>);

  const renderPreview = () => {
    const activeContent = content.filter(c => c.active);
    const grouped = activeContent.reduce((acc: Record<Section, LandingPageContent[]>, item) => {
      if (!acc[item.section]) {
        acc[item.section] = [];
      }
      acc[item.section].push(item);
      return acc;
    }, {} as Record<Section, LandingPageContent[]>);

    return (
      <div className={`${previewMode === 'mobile' ? 'max-w-sm mx-auto' : 'max-w-6xl mx-auto'}`}>
        {/* Hero Section */}
        {grouped.HERO && grouped.HERO.map(item => (
          <div key={item.id} className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20 px-6 rounded-lg mb-6">
            <div className="max-w-3xl mx-auto text-center">
              {item.title && <h1 className="text-4xl md:text-6xl font-bold mb-4">{item.title}</h1>}
              {item.subtitle && <p className="text-xl md:text-2xl mb-6 text-primary-100">{item.subtitle}</p>}
              {item.content && <p className="text-lg mb-8 text-white/90">{item.content}</p>}
              {item.buttonText && (
                <button className="bg-white text-primary-600 px-8 py-3 rounded-full font-bold text-lg hover:bg-primary-50 transition">
                  {item.buttonText}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Features Section */}
        {grouped.FEATURES && grouped.FEATURES.length > 0 && (
          <div className="py-12 mb-6">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Våre tjenester</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {grouped.FEATURES.map(item => (
                <div key={item.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
                  {item.title && <h3 className="text-xl font-bold mb-3 text-gray-900">{item.title}</h3>}
                  {item.content && <p className="text-gray-600">{item.content}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* About Section */}
        {grouped.ABOUT && grouped.ABOUT.map(item => (
          <div key={item.id} className="bg-gray-50 py-12 px-6 rounded-lg mb-6">
            <div className="max-w-3xl mx-auto">
              {item.title && <h2 className="text-3xl font-bold mb-6 text-gray-900">{item.title}</h2>}
              {item.subtitle && <p className="text-xl mb-4 text-gray-700">{item.subtitle}</p>}
              {item.content && <p className="text-gray-600 leading-relaxed">{item.content}</p>}
            </div>
          </div>
        ))}

        {/* CTA Section */}
        {grouped.CTA && grouped.CTA.map(item => (
          <div key={item.id} className="bg-primary-600 text-white py-16 px-6 rounded-lg text-center">
            {item.title && <h2 className="text-3xl md:text-4xl font-bold mb-4">{item.title}</h2>}
            {item.subtitle && <p className="text-xl mb-8 text-primary-100">{item.subtitle}</p>}
            {item.buttonText && (
              <button className="bg-white text-primary-600 px-8 py-3 rounded-full font-bold text-lg hover:bg-primary-50 transition">
                {item.buttonText}
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Landingsside CMS</h1>
            <p className="text-gray-600 mt-1">Administrer innholdet på din landingsside</p>
          </div>
          <div className="flex gap-2">
            {content.length === 0 && (
              <button onClick={handleInit} className="btn btn-secondary">
                <Plus className="w-4 h-4 mr-2" />
                Opprett standard innhold
              </button>
            )}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="btn btn-outline"
            >
              {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showPreview ? 'Skjul' : 'Forhåndsvisning'}
            </button>
            <button
              onClick={() => {
                setEditing({ section: 'HERO', sortOrder: 0, active: false });
                setShowForm(true);
              }}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nytt innhold
            </button>
          </div>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Globe className="w-5 h-5 mr-2 text-primary-600" />
                  Forhåndsvisning
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewMode('desktop')}
                    className={`p-2 rounded ${previewMode === 'desktop' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600'}`}
                    title="Desktop visning"
                  >
                    <Monitor className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setPreviewMode('mobile')}
                    className={`p-2 rounded ${previewMode === 'mobile' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600'}`}
                    title="Mobil visning"
                  >
                    <Smartphone className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 bg-gray-100 overflow-auto max-h-[600px]">
              {renderPreview()}
            </div>
          </div>
        )}

        {/* Content Sections */}
        <div className="space-y-6">
          {(['HERO', 'FEATURES', 'ABOUT', 'CTA', 'NEWS'] as Section[]).map(section => (
            <div key={section} className="bg-white rounded-lg shadow border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">{section}</h2>
                <p className="text-sm text-gray-600">
                  {section === 'HERO' && 'Hovedbanner øverst på siden'}
                  {section === 'FEATURES' && 'Funksjoner og tjenester'}
                  {section === 'ABOUT' && 'Om oss seksjon'}
                  {section === 'CTA' && 'Call to Action - oppfordring til handling'}
                  {section === 'NEWS' && 'Nyheter og oppdateringer'}
                </p>
              </div>
              <div className="p-6 space-y-4">
                {groupedContent[section]?.sort((a, b) => a.sortOrder - b.sortOrder).map((item) => (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-4 ${item.active ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {item.active ? (
                            <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                              <Check className="w-3 h-3 mr-1" />
                              Publisert
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded">
                              <EyeOff className="w-3 h-3 mr-1" />
                              Utkast
                            </span>
                          )}
                          <span className="text-xs text-gray-500">Rekkefølge: {item.sortOrder}</span>
                        </div>
                        {item.title && <h3 className="font-bold text-lg text-gray-900">{item.title}</h3>}
                        {item.subtitle && <p className="text-gray-700 mt-1">{item.subtitle}</p>}
                        {item.content && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{item.content}</p>}
                        {item.buttonText && (
                          <div className="mt-2 text-sm">
                            <span className="text-primary-600 font-medium">Knapp: {item.buttonText}</span>
                            {item.buttonUrl && <span className="text-gray-500"> → {item.buttonUrl}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleMove(item, 'up')}
                            className="p-1 hover:bg-gray-200 rounded"
                            title="Flytt opp"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMove(item, 'down')}
                            className="p-1 hover:bg-gray-200 rounded"
                            title="Flytt ned"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleTogglePublish(item)}
                            className={`p-1 rounded ${item.active ? 'hover:bg-red-100 text-red-600' : 'hover:bg-green-100 text-green-600'}`}
                            title={item.active ? 'Avpubliser' : 'Publiser'}
                          >
                            {item.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => {
                              setEditing(item);
                              setShowForm(true);
                            }}
                            className="p-1 hover:bg-blue-100 text-blue-600 rounded"
                            title="Rediger"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id!)}
                            className="p-1 hover:bg-red-100 text-red-600 rounded"
                            title="Slett"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {(!groupedContent[section] || groupedContent[section].length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <p>Ingen innhold i denne seksjonen</p>
                    <button
                      onClick={() => {
                        setEditing({ section, sortOrder: 0, active: false });
                        setShowForm(true);
                      }}
                      className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
                    >
                      + Legg til innhold
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {content.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Ingen innhold ennå</p>
            <button onClick={handleInit} className="btn btn-primary">
              Opprett standard innhold
            </button>
          </div>
        )}

        {/* Edit/Create Modal */}
        {showForm && editing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">{editing.id ? 'Rediger' : 'Nytt'} innhold</h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Seksjon *</label>
                  <select
                    value={editing.section}
                    onChange={(e) => setEditing({ ...editing, section: e.target.value as Section })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="HERO">Hero (Hovedbanner)</option>
                    <option value="FEATURES">Features (Funksjoner)</option>
                    <option value="ABOUT">Om oss</option>
                    <option value="CTA">CTA (Call to Action)</option>
                    <option value="NEWS">Nyheter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tittel</label>
                  <input
                    type="text"
                    value={editing.title || ''}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="F.eks. Velkommen til ObliKey"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Undertittel</label>
                  <input
                    type="text"
                    value={editing.subtitle || ''}
                    onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="F.eks. Din komplette treningsløsning"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Innhold</label>
                  <textarea
                    value={editing.content || ''}
                    onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    rows={4}
                    placeholder="Beskriv innholdet..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bilde URL</label>
                  <input
                    type="url"
                    value={editing.imageUrl || ''}
                    onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Knapp tekst</label>
                    <input
                      type="text"
                      value={editing.buttonText || ''}
                      onChange={(e) => setEditing({ ...editing, buttonText: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="F.eks. Kom i gang"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Knapp URL</label>
                    <input
                      type="text"
                      value={editing.buttonUrl || ''}
                      onChange={(e) => setEditing({ ...editing, buttonUrl: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="/register"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rekkefølge</label>
                  <input
                    type="number"
                    value={editing.sortOrder}
                    onChange={(e) => setEditing({ ...editing, sortOrder: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    min="0"
                  />
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="active-checkbox"
                    checked={editing.active}
                    onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                  />
                  <label htmlFor="active-checkbox" className="text-sm font-medium">
                    Publiser umiddelbart (hvis ikke valgt blir det lagret som utkast)
                  </label>
                </div>
                <div className="flex gap-2 pt-4">
                  <button type="submit" className="btn btn-primary flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    Lagre
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditing(null);
                    }}
                    className="btn btn-outline flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Avbryt
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
