import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Calendar, Clock, X, RotateCcw } from 'lucide-react';
import type { Booking } from '../types';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>(() => {
    // Load filter preference from localStorage
    return localStorage.getItem('bookingsFilter') || 'all';
  });

  useEffect(() => {
    loadBookings();
  }, []);

  // Save filter preference to localStorage
  useEffect(() => {
    localStorage.setItem('bookingsFilter', filter);
  }, [filter]);

  // Auto-refresh every 30 seconds to update booking status
  useEffect(() => {
    const interval = setInterval(() => {
      loadBookings();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const loadBookings = async () => {
    try {
      const response = await api.getMyBookings();
      setBookings(response.data);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Er du sikker på at du vil kansellere denne bookingen?')) {
      return;
    }

    try {
      await api.cancelBooking(bookingId, 'Kansellert av bruker');
      alert('Booking kansellert');
      loadBookings();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Kunne ikke kansellere booking');
    }
  };

  const handleRebook = async (classId: string, className: string) => {
    if (!confirm(`Vil du booke "${className}" på nytt?`)) {
      return;
    }

    try {
      await api.createBooking({ classId });
      alert('Booking bekreftet!');
      loadBookings();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Kunne ikke booke på nytt');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      CONFIRMED: 'badge-success',
      PENDING: 'badge-warning',
      CANCELLED: 'badge-error',
      COMPLETED: 'badge-info',
    };
    return badges[status] || 'badge-info';
  };

  // Filter bookings based on selected filter
  const filteredBookings = bookings.filter((booking) => {
    if (filter === 'all') return true;
    if (filter === 'active') return booking.status === 'CONFIRMED' || booking.status === 'PENDING';
    return booking.status === filter.toUpperCase();
  });

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
        <h1 className="text-3xl font-bold text-gray-900">Mine Bookinger</h1>

        {/* Filter Buttons */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Alle ({bookings.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'active'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Aktive ({bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING').length})
            </button>
            <button
              onClick={() => setFilter('confirmed')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'confirmed'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Bekreftet ({bookings.filter(b => b.status === 'CONFIRMED').length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Venter ({bookings.filter(b => b.status === 'PENDING').length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'completed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Fullført ({bookings.filter(b => b.status === 'COMPLETED').length})
            </button>
            <button
              onClick={() => setFilter('cancelled')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'cancelled'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Kansellert ({bookings.filter(b => b.status === 'CANCELLED').length})
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <div key={booking.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{booking.class.name}</h3>
                    <span className={`badge ${getStatusBadge(booking.status)}`}>
                      {booking.status}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(booking.class.startTime).toLocaleDateString('nb-NO', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      {new Date(booking.class.startTime).toLocaleTimeString('nb-NO', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      - {new Date(booking.class.endTime).toLocaleTimeString('nb-NO', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  {booking.notes && (
                    <p className="mt-2 text-sm text-gray-600">Notat: {booking.notes}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  {booking.status === 'CONFIRMED' && (
                    <button
                      onClick={() => handleCancel(booking.id)}
                      className="btn btn-outline text-red-600 border-red-600 hover:bg-red-50"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Kanseller
                    </button>
                  )}

                  {booking.status === 'CANCELLED' && new Date(booking.class.startTime) > new Date() && (
                    <button
                      onClick={() => handleRebook(booking.class.id, booking.class.name)}
                      className="btn btn-outline text-blue-600 border-blue-600 hover:bg-blue-50"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Book på nytt
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredBookings.length === 0 && !loading && (
          <div className="text-center py-12 card">
            <p className="text-gray-500">
              {bookings.length === 0
                ? 'Du har ingen bookinger'
                : `Ingen ${filter === 'all' ? '' : filter === 'active' ? 'aktive ' : filter + 'e '}bookinger`}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
