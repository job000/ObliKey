import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import Layout from '../../components/Layout';
import {
  Activity,
  Filter,
  Search,
  Calendar,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Download
} from 'lucide-react';

interface ActivityLog {
  id: string;
  tenantId: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  description: string;
  ipAddress: string;
  userAgent: string;
  metadata: any;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

interface FilterOptions {
  action: string;
  resource: string;
  userId: string;
  dateFrom: string;
  dateTo: string;
  searchTerm: string;
}

const ActivityLogsPage: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterOptions>({
    action: '',
    resource: '',
    userId: '',
    dateFrom: '',
    dateTo: '',
    searchTerm: ''
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });

  // Action types for filtering
  const actionTypes = [
    'LOGIN', 'LOGOUT', 'REGISTER', 'UPDATE_PROFILE', 'CHANGE_PASSWORD',
    'UPDATE_USERNAME', 'UPDATE_AVATAR', 'BOOK_CLASS', 'CANCEL_BOOKING',
    'CREATE_ORDER', 'CANCEL_ORDER', 'SEND_MESSAGE', 'PAYMENT',
    'CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT',
    'DEACTIVATE_USER', 'ACTIVATE_USER', 'UPDATE_USER_ROLE'
  ];

  const resourceTypes = [
    'Auth', 'User', 'Class', 'Booking', 'Order', 'Product',
    'Message', 'Payment', 'Avatar', 'Profile'
  ];

  useEffect(() => {
    loadActivityLogs();
  }, [pagination.page, filters]);

  const loadActivityLogs = async () => {
    try {
      setLoading(true);
      setError('');

      // Build query params
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      if (filters.action) params.append('action', filters.action);
      if (filters.resource) params.append('resource', filters.resource);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.searchTerm) params.append('search', filters.searchTerm);

      const queryParams: any = {};
      if (filters.action) queryParams.action = filters.action;
      if (filters.resource) queryParams.resource = filters.resource;
      if (filters.userId) queryParams.userId = filters.userId;
      if (filters.dateFrom) queryParams.startDate = filters.dateFrom;
      if (filters.dateTo) queryParams.endDate = filters.dateTo;
      if (filters.searchTerm) queryParams.search = filters.searchTerm;
      queryParams.page = pagination.page.toString();
      queryParams.limit = pagination.limit.toString();

      const response = await api.getActivityLogs(queryParams);

      if (response.success) {
        setLogs(response.data.logs);
        setPagination({
          ...pagination,
          total: response.data.total,
          totalPages: response.data.totalPages
        });
      }
    } catch (err: any) {
      console.error('Failed to load activity logs:', err);
      setError(err.response?.data?.error || 'Kunne ikke laste aktivitetslogger');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: keyof FilterOptions, value: string) => {
    setFilters({ ...filters, [field]: value });
    setPagination({ ...pagination, page: 1 }); // Reset to first page
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      resource: '',
      userId: '',
      dateFrom: '',
      dateTo: '',
      searchTerm: ''
    });
    setPagination({ ...pagination, page: 1 });
  };

  const exportLogs = async () => {
    try {
      const exportParams: any = {};
      if (filters.action) exportParams.action = filters.action;
      if (filters.resource) exportParams.resource = filters.resource;
      if (filters.userId) exportParams.userId = filters.userId;
      if (filters.dateFrom) exportParams.dateFrom = filters.dateFrom;
      if (filters.dateTo) exportParams.dateTo = filters.dateTo;
      if (filters.searchTerm) exportParams.search = filters.searchTerm;

      const blob = await api.exportActivityLogs(exportParams);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `activity-logs-${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export logs:', err);
      alert('Kunne ikke eksportere logger');
    }
  };

  const getActionColor = (action: string): string => {
    if (action.includes('LOGIN') || action.includes('REGISTER')) return 'text-green-600 bg-green-50';
    if (action.includes('LOGOUT')) return 'text-gray-600 bg-gray-50';
    if (action.includes('DELETE') || action.includes('CANCEL')) return 'text-red-600 bg-red-50';
    if (action.includes('UPDATE') || action.includes('CHANGE')) return 'text-blue-600 bg-blue-50';
    if (action.includes('CREATE') || action.includes('BOOK')) return 'text-purple-600 bg-purple-50';
    if (action.includes('PAYMENT') || action.includes('ORDER')) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Akkurat nå';
    if (diffMins < 60) return `${diffMins} min siden`;
    if (diffHours < 24) return `${diffHours} time${diffHours > 1 ? 'r' : ''} siden`;
    if (diffDays < 7) return `${diffDays} dag${diffDays > 1 ? 'er' : ''} siden`;

    return date.toLocaleDateString('nb-NO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
            <Activity className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Ingen tilgang</h2>
            <p className="text-gray-600">Du har ikke tilgang til aktivitetslogger.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-3">
              <Activity className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Aktivitetslogger</h1>
                <p className="text-gray-600 mt-1">
                  Totalt {pagination.total} hendelser
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span>Filtrer</span>
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              <button
                onClick={loadActivityLogs}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Oppdater</span>
              </button>

              <button
                onClick={exportLogs}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Eksporter</span>
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Search */}
                <div className="lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Search className="w-4 h-4 inline mr-1" />
                    Søk
                  </label>
                  <input
                    type="text"
                    value={filters.searchTerm}
                    onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                    placeholder="Søk i beskrivelse, IP-adresse, eller bruker..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Action Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Handlingstype
                  </label>
                  <select
                    value={filters.action}
                    onChange={(e) => handleFilterChange('action', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Alle handlinger</option>
                    {actionTypes.map(action => (
                      <option key={action} value={action}>{action}</option>
                    ))}
                  </select>
                </div>

                {/* Resource Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ressurstype
                  </label>
                  <select
                    value={filters.resource}
                    onChange={(e) => handleFilterChange('resource', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Alle ressurser</option>
                    {resourceTypes.map(resource => (
                      <option key={resource} value={resource}>{resource}</option>
                    ))}
                  </select>
                </div>

                {/* Date From */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Fra dato
                  </label>
                  <input
                    type="datetime-local"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Date To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Til dato
                  </label>
                  <input
                    type="datetime-local"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Nullstill filtre
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Activity Logs List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Laster aktivitetslogger...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Ingen aktiviteter funnet</h3>
            <p className="text-gray-500">Prøv å justere filtrene dine</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                          <span className="text-sm text-gray-500">
                            {log.resource}
                          </span>
                        </div>

                        <p className="text-gray-800 font-medium mb-2">
                          {log.description}
                        </p>

                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          {log.user && (
                            <div className="flex items-center space-x-1">
                              <User className="w-4 h-4" />
                              <span>{log.user.firstName} {log.user.lastName}</span>
                              <span className="text-gray-400">({log.user.role})</span>
                            </div>
                          )}

                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{formatDate(log.createdAt)}</span>
                          </div>

                          <span className="text-gray-400">IP: {log.ipAddress}</span>
                        </div>

                        {/* Expandable Details */}
                        {expandedLog === log.id && (
                          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
                            <div>
                              <strong className="text-gray-700">Bruker-Agent:</strong>
                              <p className="text-gray-600 mt-1">{log.userAgent}</p>
                            </div>
                            {log.resourceId && (
                              <div>
                                <strong className="text-gray-700">Ressurs ID:</strong>
                                <p className="text-gray-600 mt-1 font-mono text-xs">{log.resourceId}</p>
                              </div>
                            )}
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div>
                                <strong className="text-gray-700">Metadata:</strong>
                                <pre className="text-gray-600 mt-1 bg-white p-2 rounded border border-gray-200 overflow-x-auto text-xs">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                        className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {expandedLog === log.id ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between bg-white rounded-lg shadow-md p-4">
                <div className="text-sm text-gray-600">
                  Viser side {pagination.page} av {pagination.totalPages}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Forrige
                  </button>

                  <span className="px-4 py-2 text-gray-700">
                    Side {pagination.page}
                  </span>

                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Neste
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default ActivityLogsPage;
