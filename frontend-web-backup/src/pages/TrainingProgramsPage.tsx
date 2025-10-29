import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Calendar, Target, Dumbbell, User, Plus, X, Edit, Trash2 } from 'lucide-react';
import type { TrainingProgram } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  notes?: string;
}

interface ProgramForm {
  name: string;
  description: string;
  customerId: string;
  startDate: string;
  endDate: string;
  goals: string;
  exercises: Exercise[];
}

export default function TrainingProgramsPage() {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<TrainingProgram | null>(null);
  const [formData, setFormData] = useState<ProgramForm>({
    name: '',
    description: '',
    customerId: '',
    startDate: '',
    endDate: '',
    goals: '',
    exercises: []
  });

  useEffect(() => {
    loadPrograms();
    if (user?.role === 'TRAINER' || user?.role === 'ADMIN') {
      loadCustomers();
    }
  }, [filter]);

  const loadPrograms = async () => {
    try {
      const params = filter === 'all' ? {} : { active: filter === 'active' };
      const response = await api.getTrainingPrograms(params);
      setPrograms(response.data);
    } catch (error) {
      console.error('Failed to load training programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await api.getClients();
      setCustomers(response.data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const handleOpenModal = (program?: TrainingProgram) => {
    if (program) {
      setEditingProgram(program);
      setFormData({
        name: program.name,
        description: program.description || '',
        customerId: program.customer.id,
        startDate: new Date(program.startDate).toISOString().split('T')[0],
        endDate: program.endDate ? new Date(program.endDate).toISOString().split('T')[0] : '',
        goals: program.goals || '',
        exercises: typeof program.exercises === 'string'
          ? JSON.parse(program.exercises)
          : program.exercises || []
      });
    } else {
      setEditingProgram(null);
      setFormData({
        name: '',
        description: '',
        customerId: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        goals: '',
        exercises: []
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProgram(null);
  };

  const handleAddExercise = () => {
    setFormData({
      ...formData,
      exercises: [...formData.exercises, { name: '', sets: 3, reps: '10', notes: '' }]
    });
  };

  const handleRemoveExercise = (index: number) => {
    setFormData({
      ...formData,
      exercises: formData.exercises.filter((_, i) => i !== index)
    });
  };

  const handleExerciseChange = (index: number, field: keyof Exercise, value: any) => {
    const updated = [...formData.exercises];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, exercises: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const programData = {
        name: formData.name,
        description: formData.description,
        customerId: formData.customerId,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
        goals: formData.goals,
        exercises: JSON.stringify(formData.exercises)
      };

      if (editingProgram) {
        await api.updateTrainingProgram(editingProgram.id, programData);
        alert('Treningsprogram oppdatert!');
      } else {
        await api.createTrainingProgram(programData);
        alert('Treningsprogram opprettet!');
      }

      handleCloseModal();
      loadPrograms();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Kunne ikke lagre treningsprogram');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Er du sikker på at du vil slette dette treningsprogrammet?')) return;

    try {
      await api.updateTrainingProgram(id, { active: false });
      alert('Treningsprogram slettet!');
      loadPrograms();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Kunne ikke slette treningsprogram');
    }
  };

  const canManagePrograms = user?.role === 'TRAINER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

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
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Treningsprogrammer</h1>
          {canManagePrograms && (
            <button onClick={() => handleOpenModal()} className="btn btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Nytt program
            </button>
          )}
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'active'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Aktive
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'completed'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Fullført
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {programs.map((program) => {
            const exercises = typeof program.exercises === 'string'
              ? JSON.parse(program.exercises)
              : program.exercises || [];

            return (
              <div key={program.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{program.name}</h3>
                    {program.description && (
                      <p className="text-sm text-gray-600 mt-1">{program.description}</p>
                    )}
                  </div>
                  <span className={`badge ${program.active ? 'badge-success' : 'badge-info'}`}>
                    {program.active ? 'Aktiv' : 'Fullført'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <strong>Start:</strong>&nbsp;
                    {new Date(program.startDate).toLocaleDateString('nb-NO')}
                    {program.endDate && (
                      <>
                        &nbsp;-&nbsp;<strong>Slutt:</strong>&nbsp;
                        {new Date(program.endDate).toLocaleDateString('nb-NO')}
                      </>
                    )}
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <User className="w-4 h-4 mr-2" />
                    <strong>Trener:</strong>&nbsp;
                    {program.trainer.firstName} {program.trainer.lastName}
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <User className="w-4 h-4 mr-2" />
                    <strong>Kunde:</strong>&nbsp;
                    {program.customer.firstName} {program.customer.lastName}
                  </div>
                </div>

                {program.goals && (
                  <div className="p-3 bg-primary-50 rounded-lg mb-4">
                    <div className="flex items-start">
                      <Target className="w-4 h-4 mr-2 mt-0.5 text-primary-600" />
                      <div>
                        <p className="text-sm font-medium text-primary-900">Mål:</p>
                        <p className="text-sm text-primary-700">{program.goals}</p>
                      </div>
                    </div>
                  </div>
                )}

                {exercises.length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start">
                      <Dumbbell className="w-4 h-4 mr-2 mt-0.5 text-gray-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 mb-2">
                          Øvelser ({exercises.length}):
                        </p>
                        <div className="space-y-2">
                          {exercises.map((exercise: Exercise, idx: number) => (
                            <div key={idx} className="text-sm">
                              <p className="font-medium text-gray-800">{exercise.name}</p>
                              <p className="text-gray-600">
                                {exercise.sets} x {exercise.reps} reps
                                {exercise.notes && ` - ${exercise.notes}`}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {canManagePrograms && program.active && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleOpenModal(program)}
                      className="btn btn-primary flex-1"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Rediger
                    </button>
                    <button
                      onClick={() => handleDelete(program.id)}
                      className="btn btn-outline text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {programs.length === 0 && (
          <div className="text-center py-12 card">
            <Dumbbell className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Ingen treningsprogrammer funnet</p>
            {canManagePrograms && (
              <button
                onClick={() => handleOpenModal()}
                className="btn btn-primary mt-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                Opprett ditt første program
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal for creating/editing program */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingProgram ? 'Rediger treningsprogram' : 'Nytt treningsprogram'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Programnavn *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="f.eks. Styrketrening Vinter 2025"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Beskrivelse
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Beskriv programmet..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kunde *
                  </label>
                  <select
                    required
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Velg kunde</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.firstName} {customer.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Startdato *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sluttdato
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mål
                  </label>
                  <textarea
                    value={formData.goals}
                    onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Hva er målet med dette programmet?"
                  />
                </div>
              </div>

              {/* Exercises */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">Øvelser</label>
                  <button
                    type="button"
                    onClick={handleAddExercise}
                    className="btn btn-sm btn-outline"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Legg til øvelse
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.exercises.map((exercise, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">
                          Øvelse {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveExercise(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <input
                          type="text"
                          required
                          value={exercise.name}
                          onChange={(e) => handleExerciseChange(index, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Øvelsesnavn (f.eks. Knebøy)"
                        />

                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="number"
                            required
                            min="1"
                            value={exercise.sets}
                            onChange={(e) => handleExerciseChange(index, 'sets', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Sett"
                          />

                          <input
                            type="text"
                            required
                            value={exercise.reps}
                            onChange={(e) => handleExerciseChange(index, 'reps', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Reps (f.eks. 10 eller 8-12)"
                          />
                        </div>

                        <input
                          type="text"
                          value={exercise.notes || ''}
                          onChange={(e) => handleExerciseChange(index, 'notes', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Notater (valgfritt)"
                        />
                      </div>
                    </div>
                  ))}

                  {formData.exercises.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <Dumbbell className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Ingen øvelser lagt til ennå</p>
                      <button
                        type="button"
                        onClick={handleAddExercise}
                        className="btn btn-sm btn-primary mt-3"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Legg til din første øvelse
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={handleCloseModal} className="btn btn-outline flex-1">
                  Avbryt
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  {editingProgram ? 'Oppdater program' : 'Opprett program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
