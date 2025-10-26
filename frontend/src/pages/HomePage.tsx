import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import {
  Calendar,
  Users,
  Dumbbell,
  TrendingUp,
  CheckCircle,
  Star,
  ArrowRight,
  Clock,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';
import { api } from '../services/api';
import type { Class } from '../types';

export default function HomePage() {
  // Always show the public landing page for everyone (both logged in and not logged in users)
  return <LandingPage />;
}

// Landing page for everyone (both logged in and not logged in users)
function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [content, setContent] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const loadContent = async () => {
    try {
      const response = await api.getLandingPageContent();
      if (response.success) {
        setContent(response.data);
      }
    } catch (error) {
      console.error('Failed to load landing page content:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContent();

    // Refresh content when window gains focus (e.g., after editing in CMS)
    const handleFocus = () => {
      loadContent();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const hero = content.HERO?.[0] || {};
  const features = content.FEATURES || [];
  const cta = content.CTA?.[0] || {};
  const footer = content.FOOTER || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <header className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Dumbbell className="w-8 h-8" />
              <h1 className="text-2xl font-bold">ObliKey</h1>
            </div>
            <div className="space-x-4">
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" className="btn btn-outline text-white border-white hover:bg-white hover:text-primary-600">
                    Dashboard
                  </Link>
                  <Link to="/shop" className="btn bg-white text-primary-600 hover:bg-gray-100">
                    Butikk
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-outline text-white border-white hover:bg-white hover:text-primary-600">
                    Logg inn
                  </Link>
                  <Link to="/register" className="btn bg-white text-primary-600 hover:bg-gray-100">
                    Kom i gang
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="text-5xl font-extrabold text-gray-900 mb-6">
            {hero.title || 'Din Komplette Treningsløsning'}
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            {hero.subtitle || 'Book timer, administrer treninger, følg fremgang - alt på ett sted.'}
          </p>
          {hero.content && (
            <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
              {hero.content}
            </p>
          )}
          <div className="flex justify-center gap-4">
            <Link to={hero.buttonUrl || '/register'} className="btn btn-primary btn-lg">
              {hero.buttonText || 'Kom i gang'} <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link to="/classes" className="btn btn-outline btn-lg">
              Se klasser
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        {features.length > 0 && (
          <div className="mt-20 grid md:grid-cols-3 gap-8">
            {features.map((feature: any, index: number) => (
              <FeatureCard
                key={feature.id || index}
                icon={
                  index === 0 ? <Calendar className="w-12 h-12 text-primary-600" /> :
                  index === 1 ? <Dumbbell className="w-12 h-12 text-secondary-600" /> :
                  <TrendingUp className="w-12 h-12 text-purple-600" />
                }
                title={feature.title}
                description={feature.content}
              />
            ))}
          </div>
        )}
      </section>

      {/* CTA Section */}
      {cta.title && (
        <section className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-16">
          <div className="max-w-4xl mx-auto text-center px-4">
            <h3 className="text-3xl font-bold mb-4">{cta.title}</h3>
            {cta.subtitle && (
              <p className="text-xl mb-8">{cta.subtitle}</p>
            )}
            <Link to={cta.buttonUrl || '/register'} className="btn bg-white text-primary-600 hover:bg-gray-100 btn-lg">
              {cta.buttonText || 'Kom i gang'}
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {/* About Section */}
            <div>
              <h4 className="font-bold mb-4">{footer[0]?.title || 'Om Oss'}</h4>
              <p className="text-gray-400">
                {footer[0]?.content || 'Norges ledende plattform for treningssentre og PT-virksomheter.'}
              </p>
            </div>

            {/* Contact Section */}
            <div>
              <h4 className="font-bold mb-4">{footer[1]?.title || 'Kontakt'}</h4>
              <div className="space-y-2 text-gray-400">
                {footer[1]?.metadata?.phone && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2" />
                    {footer[1].metadata.phone}
                  </div>
                )}
                {footer[1]?.metadata?.email && (
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    {footer[1].metadata.email}
                  </div>
                )}
                {footer[1]?.metadata?.address && (
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    {footer[1].metadata.address}
                  </div>
                )}
                {!footer[1]?.metadata && (
                  <>
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      +47 123 45 678
                    </div>
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      kontakt@oblikey.no
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      Oslo, Norge
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Links Section */}
            <div>
              <h4 className="font-bold mb-4">{footer[2]?.title || 'Lenker'}</h4>
              <div className="space-y-2 text-gray-400">
                {footer.slice(2).length > 0 ? (
                  footer.slice(2).map((link: any, index: number) => (
                    <div key={index}>
                      <Link to={link.buttonUrl || '#'} className="hover:text-white">
                        {link.subtitle || link.content}
                      </Link>
                    </div>
                  ))
                ) : (
                  <>
                    <div><Link to="/about" className="hover:text-white">Om Oss</Link></div>
                    <div><Link to="/pricing" className="hover:text-white">Priser</Link></div>
                    <div><Link to="/contact" className="hover:text-white">Kontakt</Link></div>
                    <div><Link to="/privacy" className="hover:text-white">Personvern</Link></div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 ObliKey. Alle rettigheter reservert.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Homepage for authenticated users
function AuthenticatedHomePage({ classes, loading }: { classes: Class[]; loading: boolean }) {
  return (
    <Layout>
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-12 -mx-4 sm:-mx-6 lg:-mx-8 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-4">Velkommen Tilbake! 👋</h1>
          <p className="text-xl">Klar for dagens økt?</p>
        </div>
      </div>

      <div>
        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <QuickActionCard
            to="/classes"
            icon={<Calendar className="w-8 h-8 text-primary-600" />}
            title="Book Time"
            description="Finn og book din neste økt"
          />
          <QuickActionCard
            to="/bookings"
            icon={<CheckCircle className="w-8 h-8 text-green-600" />}
            title="Mine Bookinger"
            description="Se dine kommende timer"
          />
          <QuickActionCard
            to="/training-programs"
            icon={<Dumbbell className="w-8 h-8 text-purple-600" />}
            title="Treningsprogram"
            description="Se ditt skreddersydde program"
          />
          <QuickActionCard
            to="/profile"
            icon={<Users className="w-8 h-8 text-orange-600" />}
            title="Min Profil"
            description="Oppdater din informasjon"
          />
        </div>

        {/* Featured Classes */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Populære Klasser</h2>
            <Link to="/classes" className="text-primary-600 hover:text-primary-700 font-medium">
              Se alle →
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {classes.map((cls) => (
                <ClassCard key={cls.id} class={cls} />
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

// Helper Components
function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <div className="text-4xl font-bold text-primary-600 mb-2">{number}</div>
      <div className="text-gray-600">{label}</div>
    </div>
  );
}

function BenefitItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <h4 className="font-bold mb-2">{title}</h4>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
}

function QuickActionCard({ to, icon, title, description }: { to: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <Link to={to} className="card hover:shadow-lg transition-shadow">
      <div className="flex flex-col items-center text-center">
        {icon}
        <h3 className="font-bold mt-3 mb-1">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </Link>
  );
}

function ClassCard({ class: cls }: { class: Class }) {
  return (
    <div className="card">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-bold text-lg">{cls.name}</h3>
        <span className="badge badge-success">
          {cls.availableSpots || 0} plasser
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-4">{cls.description}</p>
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <Clock className="w-4 h-4 mr-2" />
          {new Date(cls.startTime).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Users className="w-4 h-4 mr-2" />
          {cls.trainer.firstName} {cls.trainer.lastName}
        </div>
      </div>
      <Link to={`/classes/${cls.id}`} className="btn btn-primary w-full">
        Book nå
      </Link>
    </div>
  );
}
