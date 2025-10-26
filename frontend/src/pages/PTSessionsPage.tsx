import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import Layout from '../components/Layout';
import DateTimePicker from '../components/DateTimePicker';
import { Dumbbell, Plus, Calendar, Clock, MapPin, User, Award, X } from 'lucide-react';

interface PTSession {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  status: string;
  trainer: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface PTCredit {
  id: string;
  credits: number;
  used: number;
  purchaseDate: string;
  expiryDate?: string;
  notes?: string;
}

export default function PTSessionsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<PTSession[]>([]);
  const [credits, setCredits] = useState<PTCredit[]>([]);
  const [availableCredits, setAvailableCredits] = useState(0);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [formData, setFormData] = useState<{
    trainerId: string;
    customerId: string;
    title: string;
    description: string;
    startTime: Date | null;
    endTime: Date | null;
    location: string;
    price: number;
  }>({
    trainerId: '',
    customerId: '',
    title: '',
    description: '',
    startTime: null,
    endTime: null,
    location: '',
    price: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load sessions
      const sessionsResponse = await api.getPTSessions();
      if (sessionsResponse.success) {
        setSessions(sessionsResponse.data);
      }

      // Load PT credits
      const creditsResponse = await api.getMyPTCredits();
      if (creditsResponse.success) {
        setCredits(creditsResponse.data.credits);
        setAvailableCredits(creditsResponse.data.available);
      }

      // Load trainers (for customers booking sessions and admins assigning trainers)
      if (user?.role === 'CUSTOMER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
        const trainersResponse = await api.getTrainers();
        if (trainersResponse.success) {
          setTrainers(trainersResponse.data);
        }
      }

      // Load customers (for trainers/admins creating sessions)
      if (user?.role === 'TRAINER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
        const clientsResponse = await api.getClients();
        if (clientsResponse.success) {
          setCustomers(clientsResponse.data);
        }
      }
    } catch (error) {
      console.error('Error loading PT sessions data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Convert Date objects to ISO strings for API
      const sessionData = {
        ...formData,
        startTime: formData.startTime?.toISOString() || '',
        endTime: formData.endTime?.toISOString() || ''
      };

      const response = await api.createPTSession(sessionData);

      if (response.success) {
        alert('PT-økt opprettet!');
        setShowCreateModal(false);
        setFormData({
          trainerId: '',
          customerId: '',
          title: '',
          description: '',
          startTime: null,
          endTime: null,
          location: '',
          price: 0
        });
        loadData(); // Refresh data
      }
    } catch (error: any) {
      console.error('Create session error:', error);
      alert(error.response?.data?.error || 'Kunne ikke opprette PT-økt');
    }
  };

  const handleCancelSession = async (sessionId: string) => {
    if (!confirm('Er du sikker på at du vil kansellere denne økten? PT-time vil bli refundert hvis du kansellerer minst 24 timer før.')) {
      return;
    }

    try {
      const response = await api.cancelPTSession(sessionId);
      if (response.success) {
        alert(response.message);
        loadData(); // Refresh data
      }
    } catch (error: any) {
      console.error('Cancel session error:', error);
      alert(error.response?.data?.error || 'Kunne ikke kansellere PT-økt');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Er du sikker på at du vil slette denne økten permanent? Dette kan ikke angres.')) {
      return;
    }

    try {
      const response = await api.deletePTSession(sessionId);
      if (response.success) {
        alert(response.message);
        loadData(); // Refresh data
      }
    } catch (error: any) {
      console.error('Delete session error:', error);
      alert(error.response?.data?.error || 'Kunne ikke slette PT-økt');
    }
  };

  const upcomingSessions = sessions.filter(
    s => new Date(s.startTime) > new Date() && s.status !== 'CANCELLED'
  );
  const pastSessions = sessions.filter(
    s => new Date(s.startTime) <= new Date() || s.status === 'CANCELLED'
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
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
            <h1 className="text-3xl font-bold text-gray-900">PT-Økter</h1>
            <p className="text-gray-600 mt-1">Administrer dine personlige treningsøkter</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            {user?.role === 'CUSTOMER' ? 'Book PT-økt' : 'Opprett PT-økt'}
          </button>
        </div>

        {/* PT Credits Card */}
        {user?.role === 'CUSTOMER' && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-6 h-6" />
                  <h2 className="text-xl font-bold">Mine PT-timer</h2>
                </div>
                <p className="text-2xl font-bold">{availableCredits} tilgjengelige timer</p>
                <p className="text-blue-200 text-sm mt-1">
                  {credits.reduce((sum, c) => sum + c.used, 0)} timer brukt av totalt {credits.reduce((sum, c) => sum + c.credits, 0)}
                </p>
              </div>
              <button
                onClick={() => setShowCreditsModal(true)}
                className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Se detaljer
              </button>
            </div>
          </div>
        )}

        {/* Upcoming Sessions */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Kommende økter</h2>
          {upcomingSessions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Dumbbell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Ingen kommende PT-økter</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {user?.role === 'CUSTOMER' ? 'Book en PT-økt' : 'Opprett PT-økt'}
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {upcomingSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  userRole={user?.role}
                  onCancel={handleCancelSession}
                  onDelete={handleDeleteSession}
                />
              ))}
            </div>
          )}
        </div>

        {/* Past Sessions */}
        {pastSessions.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Tidligere økter</h2>
            <div className="grid gap-4">
              {pastSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isPast
                  userRole={user?.role}
                  onCancel={handleCancelSession}
                  onDelete={handleDeleteSession}
                />
              ))}
            </div>
          </div>
        )}

        {/* Create Session Modal */}
        {showCreateModal && (
          <CreateSessionModal
            formData={formData}
            setFormData={setFormData}
            trainers={trainers}
            customers={customers}
            onSubmit={handleCreateSession}
            onClose={() => setShowCreateModal(false)}
            userRole={user?.role}
          />
        )}

        {/* Credits Modal */}
        {showCreditsModal && (
          <CreditsModal
            credits={credits}
            availableCredits={availableCredits}
            onClose={() => setShowCreditsModal(false)}
          />
        )}
      </div>
    </Layout>
  );
}

// Session Card Component
const SessionCard: React.FC<{
  session: PTSession;
  isPast?: boolean;
  userRole?: string;
  onCancel?: (id: string) => void;
  onDelete?: (id: string) => void;
}> = ({
  session,
  isPast = false,
  userRole,
  onCancel,
  onDelete
}) => {
  const startDate = new Date(session.startTime);
  const endDate = new Date(session.endTime);
  const canCancel = session.status === 'SCHEDULED' && !isPast;
  const canDelete = (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'TRAINER');

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${isPast ? 'opacity-75' : ''}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">{session.title}</h3>
          {session.description && (
            <p className="text-gray-600 mt-1">{session.description}</p>
          )}

          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar className="w-4 h-4" />
              <span>{startDate.toLocaleDateString('nb-NO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="w-4 h-4" />
              <span>{startDate.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {session.location && (
              <div className="flex items-center gap-2 text-gray-700">
                <MapPin className="w-4 h-4" />
                <span>{session.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-700">
              <User className="w-4 h-4" />
              {userRole === 'CUSTOMER' ? (
                <span>Trener: {session.trainer.firstName} {session.trainer.lastName}</span>
              ) : (
                <span>Kunde: {session.customer.firstName} {session.customer.lastName}</span>
              )}
            </div>
            {(session as any).price > 0 && (
              <div className="text-lg font-bold text-blue-600 mt-2">
                kr {(session as any).price}
              </div>
            )}
          </div>
        </div>

        <div className="text-right space-y-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium block ${
            session.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
            session.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
            session.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {session.status === 'SCHEDULED' ? 'Planlagt' :
             session.status === 'COMPLETED' ? 'Fullført' :
             session.status === 'CANCELLED' ? 'Kansellert' :
             session.status}
          </span>

          <div className="flex flex-col gap-2">
            {canCancel && onCancel && (
              <button
                onClick={() => onCancel(session.id)}
                className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
              >
                Kanseller
              </button>
            )}
            {canDelete && onDelete && (
              <button
                onClick={() => onDelete(session.id)}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Slett
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Create Session Modal Component
const CreateSessionModal: React.FC<{
  formData: any;
  setFormData: (data: any) => void;
  trainers: any[];
  customers: any[];
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  userRole?: string;
}> = ({ formData, setFormData, trainers, customers, onSubmit, onClose, userRole }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {userRole === 'CUSTOMER' ? 'Book PT-økt' : 'Opprett PT-økt'}
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Trainer Selection (for customers) */}
            {userRole === 'CUSTOMER' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Velg trener *
                </label>
                <select
                  value={formData.trainerId}
                  onChange={(e) => setFormData({ ...formData, trainerId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Velg trener</option>
                  {trainers.map((trainer) => (
                    <option key={trainer.id} value={trainer.id}>
                      {trainer.firstName} {trainer.lastName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Trainer Selection (for admins) */}
            {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Velg trener *
                </label>
                <select
                  value={formData.trainerId}
                  onChange={(e) => setFormData({ ...formData, trainerId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Velg trener</option>
                  {trainers.map((trainer) => (
                    <option key={trainer.id} value={trainer.id}>
                      {trainer.firstName} {trainer.lastName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Customer Selection (for trainers/admins) */}
            {(userRole === 'TRAINER' || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Velg kunde *
                </label>
                <select
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Velg kunde</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.firstName} {customer.lastName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tittel *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                placeholder="F.eks. Styrketrening, Kondisjonstrening"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beskrivelse
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Legg til detaljer om økten"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DateTimePicker
                label="Starttid"
                selected={formData.startTime}
                onChange={(date) => setFormData({ ...formData, startTime: date })}
                placeholder="Velg starttid"
                required
                minDate={new Date()}
                showTimeSelect={true}
              />

              <DateTimePicker
                label="Sluttid"
                selected={formData.endTime}
                onChange={(date) => setFormData({ ...formData, endTime: date })}
                placeholder="Velg sluttid"
                required
                minDate={formData.startTime || new Date()}
                showTimeSelect={true}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lokasjon
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="F.eks. Treningssenter, Rom 1"
              />
            </div>

            {/* Price (for admin/trainer only) */}
            {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'TRAINER') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pris (NOK)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Avbryt
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {userRole === 'CUSTOMER' ? 'Book økt' : 'Opprett økt'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Credits Modal Component
const CreditsModal: React.FC<{
  credits: PTCredit[];
  availableCredits: number;
  onClose: () => void;
}> = ({ credits, availableCredits, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Mine PT-timer</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700 mb-1">Tilgjengelige timer</p>
            <p className="text-3xl font-bold text-blue-900">{availableCredits}</p>
          </div>

          {credits.length === 0 ? (
            <div className="text-center py-12">
              <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Ingen PT-timer</p>
              <p className="text-gray-500 text-sm mt-2">Kjøp PT-timer i butikken</p>
            </div>
          ) : (
            <div className="space-y-4">
              {credits.map((credit) => (
                <div key={credit.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-900">
                        {credit.credits - credit.used} av {credit.credits} timer tilgjengelig
                      </p>
                      {credit.notes && (
                        <p className="text-sm text-gray-600 mt-1">{credit.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        Kjøpt: {new Date(credit.purchaseDate).toLocaleDateString('nb-NO')}
                      </p>
                      {credit.expiryDate && (
                        <p className="text-sm text-red-600">
                          Utløper: {new Date(credit.expiryDate).toLocaleDateString('nb-NO')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${((credit.credits - credit.used) / credit.credits) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Lukk
          </button>
        </div>
      </div>
    </div>
  );
};
