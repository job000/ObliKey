import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Eye,
  ShoppingCart,
  DollarSign,
  Package,
  BarChart3,
  Calendar,
  RefreshCw,
  Download,
  Filter,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { api } from '../../services/api';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';

interface ProductView {
  product: any;
  viewCount: number;
}

interface SalesAnalytics {
  totalOrders: number;
  completedOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Array<{ status: string; count: number }>;
  topProducts: Array<{ productName: string; quantity: number; revenue: number; orders: number }>;
}

interface DashboardAnalytics {
  overview: {
    totalViews: number;
    uniqueViewers: number;
    totalProducts: number;
    activeProducts: number;
    recentOrders: number;
  };
  topProducts: ProductView[];
  viewsTrend: Array<{ date: string; views: number }>;
}

interface ConversionData {
  totalViews: number;
  uniqueSessions: number;
  totalOrders: number;
  conversionRate: string;
}

const ProductAnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'views' | 'conversion'>('overview');

  const [dashboardData, setDashboardData] = useState<DashboardAnalytics | null>(null);
  const [salesData, setSalesData] = useState<SalesAnalytics | null>(null);
  const [viewData, setViewData] = useState<ProductView[]>([]);
  const [conversionData, setConversionData] = useState<ConversionData | null>(null);

  const [period, setPeriod] = useState('30'); // days
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    loadAnalyticsData();
  }, [period, dateRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);

      const params: any = {};
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;

      // Load data based on active tab for optimization
      if (activeTab === 'overview' || !activeTab) {
        const dashboardResponse = await api.getDashboardAnalytics({ period });
        setDashboardData(dashboardResponse.data);
      }

      if (activeTab === 'sales') {
        const salesResponse = await api.getSalesAnalytics(params);
        setSalesData(salesResponse.data);
      }

      if (activeTab === 'views') {
        const viewsResponse = await api.getMostViewedProducts({ ...params, limit: 20 });
        setViewData(viewsResponse.data);
      }

      if (activeTab === 'conversion') {
        const conversionResponse = await api.getConversionRates(params);
        setConversionData(conversionResponse.data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
            <BarChart3 className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Ingen tilgang</h2>
            <p className="text-gray-600">Du har ikke tilgang til produktanalyse.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Produktanalyse</h1>
                <p className="text-gray-600 mt-1">Salgsstatistikk og produktpopularitet</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="7">Siste 7 dager</option>
                <option value="30">Siste 30 dager</option>
                <option value="90">Siste 90 dager</option>
                <option value="365">Siste år</option>
              </select>

              <button
                onClick={loadAnalyticsData}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Oppdater</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex space-x-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Oversikt
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'sales'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Salg
            </button>
            <button
              onClick={() => setActiveTab('views')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'views'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Visninger
            </button>
            <button
              onClick={() => setActiveTab('conversion')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'conversion'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Konvertering
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Laster statistikk...</p>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && dashboardData && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Totale visninger</p>
                        <p className="text-3xl font-bold text-gray-900">{dashboardData.overview.totalViews.toLocaleString()}</p>
                      </div>
                      <Eye className="w-10 h-10 text-blue-500" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Unike besøkende</p>
                        <p className="text-3xl font-bold text-gray-900">{dashboardData.overview.uniqueViewers.toLocaleString()}</p>
                      </div>
                      <TrendingUp className="w-10 h-10 text-green-500" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Produkter totalt</p>
                        <p className="text-3xl font-bold text-gray-900">{dashboardData.overview.totalProducts}</p>
                      </div>
                      <Package className="w-10 h-10 text-purple-500" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Aktive produkter</p>
                        <p className="text-3xl font-bold text-gray-900">{dashboardData.overview.activeProducts}</p>
                      </div>
                      <Package className="w-10 h-10 text-green-500" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Nye ordre</p>
                        <p className="text-3xl font-bold text-gray-900">{dashboardData.overview.recentOrders}</p>
                      </div>
                      <ShoppingCart className="w-10 h-10 text-orange-500" />
                    </div>
                  </div>
                </div>

                {/* Top Products */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Mest populære produkter</h2>
                  <div className="space-y-3">
                    {dashboardData.topProducts.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <span className="text-lg font-bold text-indigo-600">#{index + 1}</span>
                          </div>
                          {item.product && (
                            <>
                              {item.product.images && item.product.images.length > 0 && (
                                <img
                                  src={item.product.images[0].url}
                                  alt={item.product.name}
                                  className="w-12 h-12 rounded object-cover"
                                />
                              )}
                              <div>
                                <p className="font-semibold text-gray-900">{item.product.name}</p>
                                <p className="text-sm text-gray-600">{item.product.price} {item.product.currency}</p>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">{item.viewCount}</p>
                          <p className="text-sm text-gray-600">visninger</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Views Trend Chart */}
                {dashboardData.viewsTrend && dashboardData.viewsTrend.length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Visningstrend</h2>
                    <div className="space-y-2">
                      {dashboardData.viewsTrend.map((day, index) => {
                        const maxViews = Math.max(...dashboardData.viewsTrend.map(d => d.views));
                        const widthPercent = (day.views / maxViews) * 100;

                        return (
                          <div key={index} className="flex items-center space-x-3">
                            <span className="text-sm text-gray-600 w-24">
                              {new Date(day.date).toLocaleDateString('nb-NO', { month: 'short', day: 'numeric' })}
                            </span>
                            <div className="flex-1 bg-gray-200 rounded-full h-8 overflow-hidden">
                              <div
                                className="bg-indigo-600 h-full flex items-center justify-end pr-3 text-white text-sm font-medium transition-all"
                                style={{ width: `${Math.max(widthPercent, 5)}%` }}
                              >
                                {day.views}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sales Tab */}
            {activeTab === 'sales' && salesData && (
              <div className="space-y-6">
                {/* Sales Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Totalt salg</p>
                        <p className="text-3xl font-bold text-gray-900">{salesData.totalRevenue.toLocaleString()} NOK</p>
                      </div>
                      <DollarSign className="w-10 h-10 text-green-500" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Antall ordre</p>
                        <p className="text-3xl font-bold text-gray-900">{salesData.totalOrders}</p>
                      </div>
                      <ShoppingCart className="w-10 h-10 text-blue-500" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Fullførte ordre</p>
                        <p className="text-3xl font-bold text-gray-900">{salesData.completedOrders}</p>
                      </div>
                      <Package className="w-10 h-10 text-green-500" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Gj.snitt ordre</p>
                        <p className="text-3xl font-bold text-gray-900">{salesData.averageOrderValue.toLocaleString()} NOK</p>
                      </div>
                      <TrendingUp className="w-10 h-10 text-purple-500" />
                    </div>
                  </div>
                </div>

                {/* Top Selling Products */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Mest solgte produkter</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Produkt</th>
                          <th className="text-right py-3 px-4">Antall solgt</th>
                          <th className="text-right py-3 px-4">Omsetning</th>
                          <th className="text-right py-3 px-4">Ordre</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesData.topProducts.map((product, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-700">#{index + 1}</span>
                                <span>{product.productName}</span>
                              </div>
                            </td>
                            <td className="text-right py-3 px-4 font-semibold">{product.quantity}</td>
                            <td className="text-right py-3 px-4 font-semibold text-green-600">
                              {product.revenue.toLocaleString()} NOK
                            </td>
                            <td className="text-right py-3 px-4">{product.orders}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Orders by Status */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Ordre etter status</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {salesData.ordersByStatus.map((item, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-gray-900">{item.count}</p>
                        <p className="text-sm text-gray-600 mt-1">{item.status}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Views Tab */}
            {activeTab === 'views' && viewData && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Mest sette produkter</h2>
                <div className="space-y-3">
                  {viewData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-lg font-bold text-blue-600">#{index + 1}</span>
                        </div>
                        {item.product && (
                          <>
                            {item.product.images && item.product.images.length > 0 && (
                              <img
                                src={item.product.images[0].url}
                                alt={item.product.name}
                                className="w-16 h-16 rounded object-cover"
                              />
                            )}
                            <div>
                              <p className="font-semibold text-gray-900">{item.product.name}</p>
                              <p className="text-sm text-gray-600">{item.product.type} - {item.product.price} {item.product.currency}</p>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-gray-900">{item.viewCount}</p>
                        <p className="text-sm text-gray-600">visninger</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conversion Tab */}
            {activeTab === 'conversion' && conversionData && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Totale visninger</p>
                        <p className="text-3xl font-bold text-gray-900">{conversionData.totalViews.toLocaleString()}</p>
                      </div>
                      <Eye className="w-10 h-10 text-blue-500" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Unike sesjoner</p>
                        <p className="text-3xl font-bold text-gray-900">{conversionData.uniqueSessions.toLocaleString()}</p>
                      </div>
                      <TrendingUp className="w-10 h-10 text-purple-500" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Ordre</p>
                        <p className="text-3xl font-bold text-gray-900">{conversionData.totalOrders}</p>
                      </div>
                      <ShoppingCart className="w-10 h-10 text-green-500" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Konverteringsrate</p>
                        <p className="text-3xl font-bold text-gray-900">{conversionData.conversionRate}%</p>
                      </div>
                      <BarChart3 className="w-10 h-10 text-orange-500" />
                    </div>
                  </div>
                </div>

                {/* Conversion Funnel */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Konverteringstrakt</h2>
                  <div className="space-y-4">
                    {/* Views */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-gray-700">Produktvisninger</span>
                        <span className="font-bold text-gray-900">{conversionData.totalViews.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-12 overflow-hidden">
                        <div className="bg-blue-500 h-full flex items-center justify-center text-white font-medium" style={{ width: '100%' }}>
                          100%
                        </div>
                      </div>
                    </div>

                    {/* Sessions */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-gray-700">Unike sesjoner</span>
                        <span className="font-bold text-gray-900">{conversionData.uniqueSessions.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-12 overflow-hidden">
                        <div
                          className="bg-purple-500 h-full flex items-center justify-center text-white font-medium"
                          style={{ width: `${(conversionData.uniqueSessions / conversionData.totalViews) * 100}%` }}
                        >
                          {((conversionData.uniqueSessions / conversionData.totalViews) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* Orders */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-gray-700">Ordre lagt</span>
                        <span className="font-bold text-gray-900">{conversionData.totalOrders}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-12 overflow-hidden">
                        <div
                          className="bg-green-500 h-full flex items-center justify-center text-white font-medium"
                          style={{ width: `${(conversionData.totalOrders / conversionData.totalViews) * 100}%` }}
                        >
                          {conversionData.conversionRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default ProductAnalyticsPage;
