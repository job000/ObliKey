import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';
import {
  Users,
  Calendar,
  DollarSign,
  MessageSquare,
  UserCheck,
  UserX,
  Trash2,
  Shield,
  Search,
  Filter,
  X,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Send,
  RefreshCw,
  Clock,
  TrendingUp,
  BarChart3,
  Package
} from 'lucide-react';
import type { User, Class, Booking } from '../types';

type Tab = 'users' | 'calendar' | 'support';

export default function AdminPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({ to: '', subject: '', message: '' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalClasses: 0,
    totalBookings: 0,
  });

  useEffect(() => {
    loadAdminData();

    // Auto-refresh stats every 30 seconds
    const interval = setInterval(() => {
      refreshStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadAdminData = async () => {
    try {
      const [usersRes, classesRes, bookingsRes] = await Promise.all([
        api.getUsers(),
        api.getClasses(),
        api.getMyBookings(), // For now, using my bookings - should have admin endpoint
      ]);

      setUsers(usersRes.data);
      setClasses(classesRes.data);
      setBookings(bookingsRes.data);

      setStats({
        totalUsers: usersRes.data.length,
        activeUsers: usersRes.data.filter((u: User) => u.active).length,
        totalClasses: classesRes.data.length,
        totalBookings: bookingsRes.data.length,
      });
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshStats = async () => {
    setRefreshing(true);
    await loadAdminData();
  };

  const handleActivateUser = async (userId: string) => {
    if (!confirm('Er du sikker på at du vil aktivere denne brukeren?')) return;

    try {
      await api.activateUser(userId);
      await loadAdminData();
      alert('Bruker aktivert!');
    } catch (error) {
      alert('Kunne ikke aktivere bruker');
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (!confirm('Er du sikker på at du vil deaktivere denne brukeren?')) return;

    try {
      await api.deactivateUser(userId);
      await loadAdminData();
      alert('Bruker deaktivert!');
    } catch (error) {
      alert('Kunne ikke deaktivere bruker');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('ADVARSEL: Dette vil slette brukeren permanent. Er du sikker?')) return;

    try {
      await api.deleteUser(userId);
      await loadAdminData();
      alert('Bruker slettet permanent!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Kunne ikke slette bruker');
    }
  };

  const handleChangeRole = async (userId: string) => {
    const newRole = prompt('Velg ny rolle (CUSTOMER, TRAINER, ADMIN):')?.toUpperCase();

    if (!newRole || !['CUSTOMER', 'TRAINER', 'ADMIN'].includes(newRole)) {
      alert('Ugyldig rolle');
      return;
    }

    try {
      await api.updateUserRole(userId, newRole);
      await loadAdminData();
      alert('Rolle oppdatert!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Kunne ikke oppdatere rolle');
    }
  };

  const handleContactUser = (user: User) => {
    // Navigate to chat with this user
    navigate('/chat', { state: { selectedUserId: user.id, userName: `${user.firstName} ${user.lastName}` } });
  };

  const handleSendEmail = (user: User) => {
    setEmailData({
      to: user.email,
      subject: '',
      message: ''
    });
    setShowEmailModal(true);
  };

  const sendEmail = async () => {
    if (!emailData.subject || !emailData.message) {
      alert('Vennligst fyll ut emne og melding');
      return;
    }

    try {
      // TODO: Implement actual email sending via backend
      // await api.sendEmail(emailData);

      // For now, open default email client
      const mailtoLink = `mailto:${emailData.to}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.message)}`;
      window.location.href = mailtoLink;

      setShowEmailModal(false);
      setEmailData({ to: '', subject: '', message: '' });
    } catch (error) {
      alert('Kunne ikke sende e-post');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = !filterRole || user.role === filterRole;
    const matchesActive =
      filterActive === 'all' ||
      (filterActive === 'active' && user.active) ||
      (filterActive === 'inactive' && !user.active);

    return matchesSearch && matchesRole && matchesActive;
  });

  const getRoleBadge = (role: string) => {
    const badges: Record<string, string> = {
      ADMIN: 'bg-red-100 text-red-800 border-red-300',
      TRAINER: 'bg-blue-100 text-blue-800 border-blue-300',
      CUSTOMER: 'bg-green-100 text-green-800 border-green-300',
    };
    return badges[role] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
            <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-sm text-gray-500 mt-1">
              Sist oppdatert: {new Date().toLocaleTimeString('nb-NO')}
              {refreshing && <span className="ml-2 text-blue-600">Oppdaterer...</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={refreshStats}
              disabled={refreshing}
              className="px-4 py-2 rounded-lg font-medium transition-colors bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 disabled:opacity-50"
              title="Oppdater statistikk"
            >
              <RefreshCw className={`w-4 h-4 inline mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Oppdater
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'users'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Brukere
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'calendar'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              Kalender
            </button>
            <button
              onClick={() => setActiveTab('support')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'support'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              <MessageSquare className="w-4 h-4 inline mr-2" />
              Support
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Totalt Brukere</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Aktive Brukere</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Calendar className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Totalt Klasser</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalClasses}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Bookinger</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow">
            {/* Filters */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Søk etter navn eller e-post..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Alle roller</option>
                  <option value="ADMIN">Admin</option>
                  <option value="TRAINER">Trener</option>
                  <option value="CUSTOMER">Kunde</option>
                </select>
                <select
                  value={filterActive}
                  onChange={(e) => setFilterActive(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Alle statuser</option>
                  <option value="active">Aktive</option>
                  <option value="inactive">Inaktive</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bruker
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kontakt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rolle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Opprettet
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Handlinger
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-semibold">
                              {user.firstName[0]}{user.lastName[0]}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-1 mt-1">
                              <Phone className="w-3 h-3" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getRoleBadge(user.role)}`}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.active ? (
                          <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                            <CheckCircle className="w-4 h-4" />
                            Aktiv
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
                            <XCircle className="w-4 h-4" />
                            Inaktiv
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString('nb-NO')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleContactUser(user)}
                            className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors"
                            title="Send melding via chat"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSendEmail(user)}
                            className="text-purple-600 hover:text-purple-800 p-1 hover:bg-purple-50 rounded transition-colors"
                            title="Send e-post"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleChangeRole(user.id)}
                            className="text-indigo-600 hover:text-indigo-800 p-1 hover:bg-indigo-50 rounded transition-colors"
                            title="Endre rolle"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                          {user.active ? (
                            <button
                              onClick={() => handleDeactivateUser(user.id)}
                              className="text-orange-600 hover:text-orange-800 p-1 hover:bg-orange-50 rounded transition-colors"
                              title="Deaktiver bruker"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateUser(user.id)}
                              className="text-green-600 hover:text-green-800 p-1 hover:bg-green-50 rounded transition-colors"
                              title="Aktiver bruker"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors"
                            title="Slett bruker permanent"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-6">
            {/* Calendar Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Booking Kalender</h2>
                <button
                  onClick={() => navigate('/classes')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Administrer Klasser
                </button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-600 font-medium">Totalt Klasser</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{stats.totalClasses}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-600 font-medium">Totalt Bookinger</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">{stats.totalBookings}</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-sm text-purple-600 font-medium">I dag</p>
                  <p className="text-2xl font-bold text-purple-900 mt-1">
                    {classes.filter(c => {
                      const today = new Date().toDateString();
                      return new Date(c.startTime).toDateString() === today;
                    }).length}
                  </p>
                </div>
              </div>

              {/* Classes List */}
              <div className="space-y-3">
                {classes.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500">Ingen klasser funnet</p>
                    <button
                      onClick={() => navigate('/classes')}
                      className="mt-4 text-blue-600 hover:underline"
                    >
                      Opprett ny klasse
                    </button>
                  </div>
                ) : (
                  classes.map((cls) => {
                    const startDate = new Date(cls.startTime);
                    const endTime = new Date(startDate.getTime() + cls.duration * 60000);
                    const isToday = startDate.toDateString() === new Date().toDateString();
                    const isPast = startDate < new Date();

                    return (
                      <div
                        key={cls.id}
                        className={`border-l-4 ${
                          isToday ? 'border-l-blue-500 bg-blue-50' :
                          isPast ? 'border-l-gray-300 bg-gray-50' :
                          'border-l-green-500 bg-white'
                        } border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-gray-900 text-lg">{cls.name}</h3>
                              {isToday && (
                                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-full">
                                  I DAG
                                </span>
                              )}
                              {isPast && !isToday && (
                                <span className="px-2 py-0.5 bg-gray-400 text-white text-xs font-medium rounded-full">
                                  FULLFØRT
                                </span>
                              )}
                            </div>
                            {cls.description && (
                              <p className="text-sm text-gray-600 mb-3">{cls.description}</p>
                            )}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div className="flex items-center gap-1.5 text-gray-700">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                {startDate.toLocaleDateString('nb-NO', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short'
                                })}
                              </div>
                              <div className="flex items-center gap-1.5 text-gray-700">
                                <Clock className="w-4 h-4 text-gray-400" />
                                {startDate.toLocaleTimeString('nb-NO', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })} - {endTime.toLocaleTimeString('nb-NO', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                              <div className="flex items-center gap-1.5 text-gray-700">
                                <Users className="w-4 h-4 text-gray-400" />
                                Kapasitet: {cls.capacity}
                              </div>
                              <div className="flex items-center gap-1.5 text-gray-700">
                                <TrendingUp className="w-4 h-4 text-gray-400" />
                                {cls.duration} minutter
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'support' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Support & Hjelp</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  Chat med brukere
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Start en samtale med brukere direkte. Chat-systemet lar deg kommunisere i sanntid.
                </p>
                <button
                  onClick={() => navigate('/chat')}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Åpne Chat
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  Aktivitetslogg
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Se alle brukeraktiviteter, innlogginger og handlinger i systemet.
                </p>
                <button
                  onClick={() => navigate('/activity-logs')}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Se Aktivitetslogg
                </button>
              </div>
            </div>

            <div className="mt-6 border-t border-gray-200 pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Hurtiglenker</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => navigate('/admin/products')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
                >
                  <Package className="w-6 h-6 mx-auto text-indigo-600 mb-2" />
                  <span className="text-sm font-medium">Produkter</span>
                </button>
                <button
                  onClick={() => navigate('/admin/product-analytics')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-colors text-center"
                >
                  <BarChart3 className="w-6 h-6 mx-auto text-green-600 mb-2" />
                  <span className="text-sm font-medium">Produktstatistikk</span>
                </button>
                <button
                  onClick={() => navigate('/admin/orders')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
                >
                  <Calendar className="w-6 h-6 mx-auto text-purple-600 mb-2" />
                  <span className="text-sm font-medium">Bestillinger</span>
                </button>
                <button
                  onClick={() => navigate('/classes')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
                >
                  <Users className="w-6 h-6 mx-auto text-blue-600 mb-2" />
                  <span className="text-sm font-medium">Klasser</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Email Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Send E-post</h3>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Til
                  </label>
                  <input
                    type="email"
                    value={emailData.to}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emne *
                  </label>
                  <input
                    type="text"
                    value={emailData.subject}
                    onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                    placeholder="Skriv inn emne..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Melding *
                  </label>
                  <textarea
                    value={emailData.message}
                    onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                    placeholder="Skriv din melding her..."
                    rows={10}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Avbryt
                </button>
                <button
                  onClick={sendEmail}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send E-post
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
