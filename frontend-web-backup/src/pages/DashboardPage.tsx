import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Calendar, Users, TrendingUp, DollarSign, Clock, CheckCircle } from 'lucide-react';
import type { Booking, PTSession, Class } from '../types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    upcomingBookings: 0,
    totalSessions: 0,
    activePrograms: 0,
  });
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<PTSession[]>([]);
  const [recentClasses, setRecentClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      if (user?.role === 'CUSTOMER') {
        const [bookingsRes, sessionsRes] = await Promise.all([
          api.getMyBookings({ upcoming: true }),
          api.getPTSessions(),
        ]);

        setUpcomingBookings(bookingsRes.data.slice(0, 5));
        setUpcomingSessions(sessionsRes.data.slice(0, 5));
        setStats({
          upcomingBookings: bookingsRes.data.length,
          totalSessions: sessionsRes.data.length,
          activePrograms: 0,
        });
      } else if (user?.role === 'TRAINER') {
        const [sessionsRes, classesRes] = await Promise.all([
          api.getPTSessions(),
          api.getClasses(),
        ]);

        setUpcomingSessions(sessionsRes.data.slice(0, 5));
        setRecentClasses(classesRes.data.slice(0, 5));
        setStats({
          upcomingBookings: 0,
          totalSessions: sessionsRes.data.length,
          activePrograms: 0,
        });
      } else if (user?.role === 'ADMIN') {
        const classesRes = await api.getClasses();
        setRecentClasses(classesRes.data.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

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
        {/* Welcome Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Velkommen tilbake, {user?.firstName}!
          </h1>
          <p className="mt-2 text-gray-600">Her er en oversikt over dine aktiviteter</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-primary-100 rounded-lg">
                <Calendar className="w-6 h-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Kommende Bookinger</p>
                <p className="text-2xl font-bold text-gray-900">{stats.upcomingBookings}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-secondary-100 rounded-lg">
                <Users className="w-6 h-6 text-secondary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">PT-Økter</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Aktive Programmer</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activePrograms}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Dashboard */}
        {user?.role === 'CUSTOMER' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Bookings */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Kommende Bookinger</h2>
                <Link to="/bookings" className="text-primary-600 hover:text-primary-700 text-sm">
                  Se alle →
                </Link>
              </div>
              {upcomingBookings.length > 0 ? (
                <div className="space-y-3">
                  {upcomingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{booking.class.name}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(booking.class.startTime).toLocaleDateString('nb-NO')} -{' '}
                          {new Date(booking.class.startTime).toLocaleTimeString('nb-NO', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span className="badge badge-success">{booking.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Ingen kommende bookinger</p>
              )}
            </div>

            {/* Upcoming PT Sessions */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Kommende PT-Økter</h2>
                <Link to="/pt-sessions" className="text-primary-600 hover:text-primary-700 text-sm">
                  Se alle →
                </Link>
              </div>
              {upcomingSessions.length > 0 ? (
                <div className="space-y-3">
                  {upcomingSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{session.title}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(session.startTime).toLocaleDateString('nb-NO')} -{' '}
                          {new Date(session.startTime).toLocaleTimeString('nb-NO', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span className="badge badge-info">{session.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Ingen kommende økter</p>
              )}
            </div>
          </div>
        )}

        {/* Trainer/Admin Dashboard */}
        {(user?.role === 'TRAINER' || user?.role === 'ADMIN') && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Nylige Klasser</h2>
              <Link to="/classes" className="text-primary-600 hover:text-primary-700 text-sm">
                Se alle →
              </Link>
            </div>
            {recentClasses.length > 0 ? (
              <div className="space-y-3">
                {recentClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{cls.name}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(cls.startTime).toLocaleDateString('nb-NO')} -{' '}
                        {new Date(cls.startTime).toLocaleTimeString('nb-NO', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {cls.capacity - (cls._count?.bookings || 0)} / {cls.capacity} plasser
                      </p>
                      <p className="text-xs text-gray-600">ledige</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Ingen klasser funnet</p>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Hurtigvalg</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/classes" className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 transition-colors">
              <Calendar className="w-8 h-8 text-primary-600 mb-2" />
              <p className="font-medium text-gray-900">Bla gjennom klasser</p>
            </Link>
            {user?.role === 'CUSTOMER' && (
              <Link to="/bookings" className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 transition-colors">
                <CheckCircle className="w-8 h-8 text-secondary-600 mb-2" />
                <p className="font-medium text-gray-900">Mine bookinger</p>
              </Link>
            )}
            <Link to="/pt-sessions" className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 transition-colors">
              <Clock className="w-8 h-8 text-purple-600 mb-2" />
              <p className="font-medium text-gray-900">PT-Økter</p>
            </Link>
            <Link to="/profile" className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 transition-colors">
              <Users className="w-8 h-8 text-orange-600 mb-2" />
              <p className="font-medium text-gray-900">Min profil</p>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
