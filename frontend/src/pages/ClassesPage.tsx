import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import DateTimePicker from '../components/DateTimePicker';
import { Calendar, Users, Clock, Plus, X, MapPin } from 'lucide-react';
import type { Class } from '../types';
import { useAuth } from '../contexts/AuthContext';

export default function ClassesPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'GROUP_CLASS' | 'OPEN_GYM' | 'FACILITY'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    type: string;
    capacity: number;
    duration: number;
    startTime: Date | null;
    recurring: boolean;
    recurringPattern: string;
    trainerId: string;
  }>({
    name: '',
    description: '',
    type: 'GROUP_CLASS',
    capacity: 20,
    duration: 60,
    startTime: null,
    recurring: false,
    recurringPattern: '',
    trainerId: ''
  });

  const canCreateClass = user?.role === 'ADMIN' || user?.role === 'TRAINER';

  const loadTrainers = async () => {
    try {
      const response = await api.getTrainers();
      if (response.success) {
        setTrainers(response.data);
      }
    } catch (error) {
      console.error('Failed to load trainers:', error);
    }
  };

  useEffect(() => {
    loadClasses();
  }, [filter]);

  // Load trainers when modal opens
  useEffect(() => {
    if (showCreateModal && canCreateClass) {
      loadTrainers();
    }
  }, [showCreateModal]);

  // Auto-refresh every 30 seconds to update booking counts
  useEffect(() => {
    const interval = setInterval(() => {
      loadClasses();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [filter]);

  const loadClasses = async () => {
    try {
      const params = filter !== 'all' ? { type: filter } : {};
      const response = await api.getClasses(params);
      setClasses(response.data);
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (classId: string) => {
    try {
      await api.createBooking({ classId });
      alert('Booking bekreftet!');
      loadClasses(); // Reload to update available spots
    } catch (error: any) {
      alert(error.response?.data?.error || 'Booking feilet');
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Convert Date to ISO string for API
      const classData = {
        ...formData,
        startTime: formData.startTime?.toISOString() || '',
        capacity: Number(formData.capacity),
        duration: Number(formData.duration),
      };

      await api.createClass(classData);
      setShowCreateModal(false);
      setFormData({
        name: '',
        description: '',
        type: 'GROUP_CLASS',
        capacity: 20,
        duration: 60,
        startTime: null,
        recurring: false,
        recurringPattern: '',
        trainerId: ''
      });
      loadClasses();
      alert('Klasse opprettet!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Kunne ikke opprette klasse');
    }
  };

  const getClassTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      GROUP_CLASS: 'Gruppetime',
      OPEN_GYM: 'Åpen gym',
      FACILITY: 'Fasiliteter',
    };
    return labels[type] || type;
  };

  const getClassTypeBadge = (type: string) => {
    const badges: Record<string, string> = {
      GROUP_CLASS: 'bg-blue-100 text-blue-800',
      OPEN_GYM: 'bg-green-100 text-green-800',
      FACILITY: 'bg-purple-100 text-purple-800',
    };
    return badges[type] || 'bg-gray-100 text-gray-800';
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
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Klasser</h1>
          {canCreateClass && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Opprett Klasse
            </button>
          )}
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => setFilter('GROUP_CLASS')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'GROUP_CLASS'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Gruppetimer
          </button>
          <button
            onClick={() => setFilter('OPEN_GYM')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'OPEN_GYM'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Åpen gym
          </button>
          <button
            onClick={() => setFilter('FACILITY')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'FACILITY'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Fasiliteter
          </button>
        </div>

        {/* Classes Grid */}
        {classes.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen klasser funnet</h3>
            <p className="text-gray-600 mb-4">
              {canCreateClass ? 'Opprett din første klasse for å komme i gang' : 'Det er ingen tilgjengelige klasser for øyeblikket'}
            </p>
            {canCreateClass && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Opprett Klasse
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls: any) => (
              <div
                key={cls.id}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-900">{cls.name}</h3>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getClassTypeBadge(cls.type)}`}>
                      {getClassTypeLabel(cls.type)}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{cls.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(cls.startTime).toLocaleDateString('nb-NO', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      {new Date(cls.startTime).toLocaleTimeString('nb-NO', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })} ({cls.duration} min)
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
                      {cls._count?.bookings || 0} / {cls.capacity} plasser
                    </div>
                    {cls.trainer && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        Instruktør: {cls.trainer.firstName} {cls.trainer.lastName}
                      </div>
                    )}
                  </div>

                  {user?.role === 'CUSTOMER' && (
                    <button
                      onClick={() => handleBook(cls.id)}
                      disabled={(cls._count?.bookings || 0) >= cls.capacity}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {(cls._count?.bookings || 0) >= cls.capacity ? 'Fullt' : 'Book'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Opprett Ny Klasse</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Klassenavn *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="F.eks. Morgenyoga, Spinning, Crossfit"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beskrivelse *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Beskriv klassen..."
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="GROUP_CLASS">Gruppetime</option>
                  <option value="OPEN_GYM">Åpen gym</option>
                  <option value="FACILITY">Fasiliteter</option>
                </select>
              </div>

              {/* Trainer Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instruktør *
                </label>
                <select
                  value={formData.trainerId}
                  onChange={(e) => setFormData({ ...formData, trainerId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Velg instruktør</option>
                  {trainers.map((trainer) => (
                    <option key={trainer.id} value={trainer.id}>
                      {trainer.firstName} {trainer.lastName} ({trainer.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Capacity and Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kapasitet *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Varighet (min) *
                  </label>
                  <input
                    type="number"
                    required
                    min="15"
                    step="15"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Start Time */}
              <DateTimePicker
                label="Starttidspunkt"
                selected={formData.startTime}
                onChange={(date) => setFormData({ ...formData, startTime: date })}
                placeholder="Velg starttidspunkt"
                required
                minDate={new Date()}
                showTimeSelect={true}
              />

              {/* Recurring */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={formData.recurring}
                  onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="recurring" className="ml-2 text-sm text-gray-700">
                  Gjentakende klasse (ukentlig)
                </label>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Opprett Klasse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
