import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { ShoppingBag, Package, Calendar, CreditCard, ChevronDown, ChevronUp, Award, Truck, MapPin, CheckCircle } from 'lucide-react';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productType: string;
  quantity: number;
  price: number;
  sessionCount?: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  paymentMethod: string;
  createdAt: string;
  items: OrderItem[];
  requiresDelivery?: boolean;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryZip?: string;
  trackingNumber?: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export default function PurchaseHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await api.getOrders();
      if (response.success) {
        setOrders(response.data);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-700';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Fullført';
      case 'PENDING':
        return 'Venter';
      case 'CANCELLED':
        return 'Kansellert';
      default:
        return status;
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'CARD':
        return 'Kort';
      case 'VIPPS':
        return 'Vipps';
      default:
        return method;
    }
  };

  const getProductTypeText = (type: string) => {
    switch (type) {
      case 'PT_SERVICE':
        return 'PT-timer';
      case 'MEMBERSHIP':
        return 'Medlemskap';
      case 'EQUIPMENT':
        return 'Utstyr';
      case 'SUPPLEMENT':
        return 'Kosttilskudd';
      case 'APPAREL':
        return 'Klær';
      default:
        return type;
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
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-blue-600" />
            Kjøpshistorikk
          </h1>
          <p className="text-gray-600 mt-2">Se alle dine tidligere kjøp</p>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Ingen kjøp ennå</h2>
            <p className="text-gray-600 mb-6">Du har ikke gjort noen kjøp ennå</p>
            <button
              onClick={() => window.location.href = '/shop'}
              className="btn btn-primary"
            >
              Gå til butikken
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Order Header */}
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleOrderDetails(order.id)}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          Ordre #{order.orderNumber}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(order.createdAt).toLocaleDateString('nb-NO', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CreditCard className="w-4 h-4" />
                          <span>{getPaymentMethodText(order.paymentMethod)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          <span>{order.items.length} {order.items.length === 1 ? 'produkt' : 'produkter'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          {order.total.toLocaleString()} {order.currency}
                        </p>
                      </div>
                      <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        {expandedOrder === order.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Order Details (Expandable) */}
                {expandedOrder === order.id && (
                  <div className="border-t border-gray-200 bg-gray-50 p-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Ordredetaljer</h4>
                    <div className="space-y-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900">{item.productName}</h5>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-gray-600">
                                {getProductTypeText(item.productType)}
                              </span>
                              {item.productType === 'PT_SERVICE' && item.sessionCount && (
                                <>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-sm text-blue-600 font-medium flex items-center gap-1">
                                    <Award className="w-4 h-4" />
                                    {item.sessionCount * item.quantity} PT-timer
                                  </span>
                                </>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              Antall: {item.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {(item.price * item.quantity).toLocaleString()} {order.currency}
                            </p>
                            <p className="text-sm text-gray-600">
                              {item.price.toLocaleString()} {order.currency} per stk
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* PT Service Notice */}
                    {order.items.some(item => item.productType === 'PT_SERVICE') && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-blue-900 font-medium flex items-center gap-2">
                          <Award className="w-5 h-5" />
                          PT-timer tilgjengelig
                        </p>
                        <p className="text-blue-700 text-sm mt-1">
                          Dine PT-timer er tilgjengelige under "PT-Økter" i menyen
                        </p>
                      </div>
                    )}

                    {/* Delivery Status */}
                    {order.requiresDelivery && (
                      <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
                        <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Truck className="w-5 h-5 text-blue-600" />
                          Leveringsinformasjon
                        </h5>

                        {order.status === 'DELIVERED' && (
                          <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="text-green-800 font-medium">
                              Levert {order.deliveredAt && new Date(order.deliveredAt).toLocaleDateString('nb-NO')}
                            </span>
                          </div>
                        )}

                        {order.status === 'SHIPPED' && !order.deliveredAt && (
                          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                            <Truck className="w-5 h-5 text-blue-600" />
                            <span className="text-blue-800 font-medium">
                              Sendt {order.shippedAt && new Date(order.shippedAt).toLocaleDateString('nb-NO')}
                            </span>
                          </div>
                        )}

                        {order.status === 'PROCESSING' && (
                          <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                            <Package className="w-5 h-5 text-yellow-600" />
                            <span className="text-yellow-800 font-medium">
                              Behandles - Vil bli sendt snart
                            </span>
                          </div>
                        )}

                        {order.trackingNumber && (
                          <div className="flex items-center gap-2 text-sm mb-2">
                            <span className="text-gray-600">Sporingsnummer:</span>
                            <span className="font-mono font-medium text-gray-900">{order.trackingNumber}</span>
                          </div>
                        )}

                        {order.deliveryAddress && (
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                            <div>
                              <p className="text-gray-900">{order.deliveryAddress}</p>
                              <p className="text-gray-900">{order.deliveryZip} {order.deliveryCity}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Order Total */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900">Totalt betalt</span>
                        <span className="text-2xl font-bold text-gray-900">
                          {order.total.toLocaleString()} {order.currency}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
