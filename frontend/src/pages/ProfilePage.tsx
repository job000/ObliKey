import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Phone, Calendar, Save, Lock, Clock, Shield, Camera, X as XIcon, Upload, AtSign } from 'lucide-react';
import { api } from '../services/api';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [changingAvatar, setChangingAvatar] = useState(false);
  const [changingUsername, setChangingUsername] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    dateOfBirth: user?.dateOfBirth || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Refresh user data when page loads
  useEffect(() => {
    refreshUser();
  }, []);

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await api.updateUser(user!.id, formData);
      setSuccess('Profil oppdatert!');
      setEditing(false);
      await refreshUser();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Kunne ikke oppdatere profil');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Nye passord matcher ikke');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Nytt passord må være minst 6 tegn');
      return;
    }

    try {
      const response = await api.changePassword(passwordData.currentPassword, passwordData.newPassword);
      setSuccess(response.message);
      setChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Kunne ikke endre passord');
    }
  };

  const handleAvatarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!avatarUrl.trim()) {
      setError('Vennligst legg inn en gyldig bilde-URL');
      return;
    }

    try {
      const response = await api.updateAvatar(user!.id, avatarUrl.trim());
      setSuccess(response.message);
      setChangingAvatar(false);
      setAvatarUrl('');
      await refreshUser();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Kunne ikke oppdatere profilbilde');
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm('Er du sikker på at du vil fjerne profilbildet ditt?')) return;

    setError('');
    setSuccess('');

    try {
      const response = await api.removeAvatar(user!.id);
      setSuccess(response.message);
      await refreshUser();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Kunne ikke fjerne profilbilde');
    }
  };

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newUsername.trim()) {
      setError('Vennligst skriv inn et brukernavn');
      return;
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(newUsername)) {
      setError('Brukernavn må være 3-20 tegn og kan bare inneholde bokstaver, tall og understrek');
      return;
    }

    try {
      const response = await api.updateUsername(user!.id, newUsername.trim());
      setSuccess(response.message);
      setChangingUsername(false);
      setNewUsername('');
      await refreshUser();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Kunne ikke oppdatere brukernavn');
    }
  };

  // Calculate remaining username changes
  const currentYear = new Date().getFullYear();
  const isNewYear = user?.lastUsernameChangeYear !== currentYear;
  const remainingChanges = isNewYear ? 3 : Math.max(0, 3 - (user?.usernameChangesThisYear || 0));
  const canChangeUsername = remainingChanges > 0;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Min Profil</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Profile Picture Section */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Profilbilde</h2>

          <div className="flex items-center gap-6">
            {/* Avatar Display */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-gray-200 flex items-center justify-center">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-16 h-16 text-gray-400" />
                )}
              </div>
            </div>

            {/* Avatar Controls */}
            <div className="flex-1">
              {!changingAvatar ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    {user?.avatar
                      ? 'Ditt profilbilde vises i en rund sirkel på tvers av plattformen.'
                      : 'Du har ikke lastet opp et profilbilde ennå.'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setChangingAvatar(true)}
                      className="btn btn-outline flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      {user?.avatar ? 'Endre profilbilde' : 'Last opp profilbilde'}
                    </button>
                    {user?.avatar && (
                      <button
                        onClick={handleRemoveAvatar}
                        className="btn btn-outline text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <XIcon className="w-4 h-4 mr-2" />
                        Fjern
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAvatarSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bilde-URL
                    </label>
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/min-avatar.jpg"
                      className="input"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Lim inn en URL til et bilde fra internett (f.eks. fra Unsplash, Imgur, etc.)
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button type="submit" className="btn btn-primary flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Lagre profilbilde
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setChangingAvatar(false);
                        setAvatarUrl('');
                        setError('');
                      }}
                      className="btn btn-outline"
                    >
                      Avbryt
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Personlig Informasjon</h2>
            {!editing && (
              <button onClick={() => setEditing(true)} className="btn btn-outline">
                Rediger
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fornavn
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Etternavn
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fødselsdato
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button type="submit" className="btn btn-primary">
                  <Save className="w-4 h-4 mr-2" />
                  Lagre endringer
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="btn btn-outline"
                >
                  Avbryt
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center">
                <User className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Navn</p>
                  <p className="font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <Mail className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">E-post</p>
                  <p className="font-medium text-gray-900">{user?.email}</p>
                </div>
              </div>

              {user?.phone && (
                <div className="flex items-center">
                  <Phone className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Telefon</p>
                    <p className="font-medium text-gray-900">{user.phone}</p>
                  </div>
                </div>
              )}

              {user?.dateOfBirth && (
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Fødselsdato</p>
                    <p className="font-medium text-gray-900">
                      {new Date(user.dateOfBirth).toLocaleDateString('nb-NO')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Username Section */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Brukernavn</h2>
            {!changingUsername && canChangeUsername && (
              <button
                onClick={() => setChangingUsername(true)}
                className="btn btn-outline"
              >
                {user?.username ? 'Endre brukernavn' : 'Sett brukernavn'}
              </button>
            )}
          </div>

          {!changingUsername ? (
            <div className="space-y-4">
              <div className="flex items-center">
                <AtSign className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Brukernavn</p>
                  <p className="font-medium text-gray-900">
                    {user?.username || 'Ikke satt'}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Endringer igjen i år:</strong> {remainingChanges} av 3
                </p>
                {!canChangeUsername && (
                  <p className="text-sm text-blue-700 mt-2">
                    Du har brukt opp alle brukernavn-endringer for i år. Du kan endre igjen fra {new Date().getFullYear() + 1}.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleUsernameSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nytt brukernavn
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder={user?.username || 'brukernavn'}
                  className="input"
                  pattern="[a-zA-Z0-9_]{3,20}"
                  title="3-20 tegn, kun bokstaver, tall og understrek"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  3-20 tegn. Kun bokstaver, tall og understrek.
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Du har {remainingChanges} endringer igjen i år.
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <button type="submit" className="btn btn-primary flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Lagre brukernavn
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChangingUsername(false);
                    setNewUsername('');
                    setError('');
                  }}
                  className="btn btn-outline"
                >
                  Avbryt
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Kontoinnstillinger</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Shield className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Rolle</p>
                  <p className="text-sm text-gray-600">{user?.role?.replace('_', ' ')}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <User className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Kontostatus</p>
                  <p className="text-sm text-gray-600">{user?.active ? 'Aktiv' : 'Inaktiv'}</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user?.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {user?.active ? 'Aktiv' : 'Inaktiv'}
              </span>
            </div>

            {user?.lastLoginAt && (
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <Clock className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Sist innlogget</p>
                  <p className="text-sm text-gray-600">
                    {new Date(user.lastLoginAt).toLocaleString('nb-NO')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Sikkerhet</h2>
            {!changingPassword && (
              <button onClick={() => setChangingPassword(true)} className="btn btn-outline">
                <Lock className="w-4 h-4 mr-2" />
                Endre passord
              </button>
            )}
          </div>

          {changingPassword ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nåværende passord
                </label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nytt passord
                </label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="input"
                  required
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">Minst 6 tegn</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bekreft nytt passord
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="input"
                  required
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button type="submit" className="btn btn-primary">
                  <Lock className="w-4 h-4 mr-2" />
                  Endre passord
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChangingPassword(false);
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                    setError('');
                  }}
                  className="btn btn-outline"
                >
                  Avbryt
                </button>
              </div>
            </form>
          ) : (
            <p className="text-gray-600">
              Klikk på "Endre passord" for å oppdatere passordet ditt.
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
}
