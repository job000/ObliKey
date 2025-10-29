import React, { useState, useEffect } from 'react';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Eye,
  X,
  Edit2
} from 'lucide-react';
import { api } from '../../services/api';
import Layout from '../../components/Layout';

type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
type ProductType = 'PHYSICAL_PRODUCT' | 'PT_SERVICE' | 'MEMBERSHIP' | 'DIGITAL';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productType: ProductType;
  quantity: number;
  price: number;
  subtotal: number;
  sessionCount?: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  requiresDelivery: boolean;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryZip?: string;
  trackingNumber?: string;
  shippedAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  items: OrderItem[];
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800'
};

const statusLabels = {
  PENDING: 'Venter',
  PROCESSING: 'Behandles',
  SHIPPED: 'Sendt',
  DELIVERED: 'Levert',
  COMPLETED: 'Fullført',
  CANCELLED: 'Kansellert',
  REFUNDED: 'Refundert'
};

const productTypeLabels = {
  PHYSICAL_PRODUCT: 'Fysisk produkt',
  PT_SERVICE: 'PT-økt',
  MEMBERSHIP: 'Medlemskap',
  DIGITAL: 'Digital'
};

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const [deliveryForm, setDeliveryForm] = useState({
    deliveryAddress: '',
    deliveryCity: '',
    deliveryZip: ''
  });

  const [trackingNumber, setTrackingNumber] = useState('');
  const [newStatus, setNewStatus] = useState<OrderStatus>('PROCESSING');

  useEffect(() => {
    loadOrders();
  }, [filterStatus]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await api.getOrders({
        status: filterStatus || undefined
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order =>
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${order.user.firstName} ${order.user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openDetailsModal = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const openShippingModal = (order: Order) => {
    setSelectedOrder(order);
    setTrackingNumber(order.trackingNumber || '');
    setShowShippingModal(true);
  };

  const openDeliveryModal = (order: Order) => {
    setSelectedOrder(order);
    setDeliveryForm({
      deliveryAddress: order.deliveryAddress || '',
      deliveryCity: order.deliveryCity || '',
      deliveryZip: order.deliveryZip || ''
    });
    setShowDeliveryModal(true);
  };

  const openStatusModal = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setShowStatusModal(true);
  };

  const handleUpdateDeliveryInfo = async () => {
    if (!selectedOrder) return;

    try {
      await api.updateDeliveryInfo(selectedOrder.id, deliveryForm);
      await loadOrders();
      setShowDeliveryModal(false);
      alert('Leveringsinformasjon oppdatert');
    } catch (error) {
      console.error('Failed to update delivery info:', error);
      alert('Kunne ikke oppdatere leveringsinformasjon');
    }
  };

  const handleMarkAsShipped = async () => {
    if (!selectedOrder) return;

    try {
      await api.markOrderAsShipped(selectedOrder.id, trackingNumber || undefined);
      await loadOrders();
      setShowShippingModal(false);
      alert('Ordre markert som sendt');
    } catch (error) {
      console.error('Failed to mark as shipped:', error);
      alert('Kunne ikke markere som sendt');
    }
  };

  const handleMarkAsDelivered = async (orderId: string) => {
    if (!confirm('Er du sikker på at ordren er levert?')) return;

    try {
      await api.markOrderAsDelivered(orderId);
      await loadOrders();
      alert('Ordre markert som levert');
    } catch (error) {
      console.error('Failed to mark as delivered:', error);
      alert('Kunne ikke markere som levert');
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder) return;

    try {
      await api.updateOrderStatus(selectedOrder.id, newStatus);
      await loadOrders();
      setShowStatusModal(false);
      alert('Ordrestatus oppdatert');
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert('Kunne ikke oppdatere ordrestatus');
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Ordrebehandling</h1>
          <p className="text-gray-600">Administrer bestillinger og leveringer</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Søk etter ordrenummer, kunde..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
              >
                <option value="">Alle statuser</option>
                <option value="PENDING">Venter</option>
                <option value="PROCESSING">Behandles</option>
                <option value="SHIPPED">Sendt</option>
                <option value="DELIVERED">Levert</option>
                <option value="COMPLETED">Fullført</option>
                <option value="CANCELLED">Kansellert</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ordrenummer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kunde
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produkter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Levering
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Handlinger
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString('nb-NO')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {order.user.firstName} {order.user.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{order.user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {order.items.map(item => (
                            <div key={item.id} className="mb-1">
                              {item.quantity}x {item.productName}
                              <span className="text-xs text-gray-500 ml-1">
                                ({productTypeLabels[item.productType]})
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {order.total.toFixed(2)} NOK
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[order.status]}`}>
                          {statusLabels[order.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.requiresDelivery ? (
                          <div className="text-sm">
                            {order.status === 'SHIPPED' && (
                              <div className="flex items-center text-purple-600">
                                <Truck className="w-4 h-4 mr-1" />
                                <span>Sendt</span>
                              </div>
                            )}
                            {order.status === 'DELIVERED' && (
                              <div className="flex items-center text-green-600">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                <span>Levert</span>
                              </div>
                            )}
                            {order.status === 'PROCESSING' && (
                              <div className="flex items-center text-blue-600">
                                <Clock className="w-4 h-4 mr-1" />
                                <span>Venter</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">Digital levering</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openDetailsModal(order)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Se detaljer"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => openStatusModal(order)}
                            className="text-orange-600 hover:text-orange-900"
                            title="Endre status"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          {order.requiresDelivery && order.status === 'PROCESSING' && (
                            <>
                              <button
                                onClick={() => openDeliveryModal(order)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Rediger leveringsinformasjon"
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => openShippingModal(order)}
                                className="text-purple-600 hover:text-purple-900"
                                title="Marker som sendt"
                              >
                                <Truck className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          {order.requiresDelivery && order.status === 'SHIPPED' && (
                            <button
                              onClick={() => handleMarkAsDelivered(order.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Marker som levert"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Order Details Modal */}
        {showDetailsModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Ordredetaljer</h2>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Order Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Ordrenummer</label>
                      <p className="text-gray-900 font-medium">{selectedOrder.orderNumber}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <p>
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[selectedOrder.status]}`}>
                          {statusLabels[selectedOrder.status]}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Kunde</label>
                      <p className="text-gray-900">{selectedOrder.user.firstName} {selectedOrder.user.lastName}</p>
                      <p className="text-sm text-gray-500">{selectedOrder.user.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Opprettet</label>
                      <p className="text-gray-900">{new Date(selectedOrder.createdAt).toLocaleString('nb-NO')}</p>
                    </div>
                  </div>

                  {/* Delivery Info */}
                  {selectedOrder.requiresDelivery && (
                    <div className="border-t pt-4">
                      <h3 className="text-lg font-semibold mb-3">Leveringsinformasjon</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Adresse</label>
                          <p className="text-gray-900">{selectedOrder.deliveryAddress || 'Ikke oppgitt'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">By</label>
                          <p className="text-gray-900">{selectedOrder.deliveryCity || 'Ikke oppgitt'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Postnummer</label>
                          <p className="text-gray-900">{selectedOrder.deliveryZip || 'Ikke oppgitt'}</p>
                        </div>
                        {selectedOrder.trackingNumber && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Sporingsnummer</label>
                            <p className="text-gray-900">{selectedOrder.trackingNumber}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Order Items */}
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-3">Produkter</h3>
                    <div className="space-y-2">
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{item.productName}</p>
                            <p className="text-sm text-gray-500">
                              {productTypeLabels[item.productType]} • Antall: {item.quantity}
                              {item.sessionCount && ` • ${item.sessionCount} økter per enhet`}
                            </p>
                          </div>
                          <p className="font-medium text-gray-900">{item.subtotal.toFixed(2)} NOK</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="text-gray-900">{selectedOrder.subtotal.toFixed(2)} NOK</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">MVA</span>
                      <span className="text-gray-900">{selectedOrder.tax.toFixed(2)} NOK</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total</span>
                      <span>{selectedOrder.total.toFixed(2)} NOK</span>
                    </div>
                  </div>

                  {selectedOrder.notes && (
                    <div className="border-t pt-4">
                      <label className="text-sm font-medium text-gray-500">Notater</label>
                      <p className="text-gray-900 mt-1">{selectedOrder.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delivery Info Modal */}
        {showDeliveryModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Rediger leveringsinformasjon</h2>
                  <button
                    onClick={() => setShowDeliveryModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Leveringsadresse
                    </label>
                    <input
                      type="text"
                      value={deliveryForm.deliveryAddress}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryAddress: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Gate og nummer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      By
                    </label>
                    <input
                      type="text"
                      value={deliveryForm.deliveryCity}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryCity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="By"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Postnummer
                    </label>
                    <input
                      type="text"
                      value={deliveryForm.deliveryZip}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryZip: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Postnummer"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowDeliveryModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Avbryt
                    </button>
                    <button
                      onClick={handleUpdateDeliveryInfo}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      Lagre
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Shipping Modal */}
        {showShippingModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Marker som sendt</h2>
                  <button
                    onClick={() => setShowShippingModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sporingsnummer (valgfritt)
                    </label>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Sporingsnummer"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowShippingModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Avbryt
                    </button>
                    <button
                      onClick={handleMarkAsShipped}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      Marker som sendt
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Update Modal */}
        {showStatusModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Oppdater ordrestatus</h2>
                  <button
                    onClick={() => setShowStatusModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ordrenummer
                    </label>
                    <p className="text-gray-900 font-medium">{selectedOrder.orderNumber}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ny status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="PENDING">Venter</option>
                      <option value="PROCESSING">Behandles</option>
                      <option value="SHIPPED">Sendt</option>
                      <option value="DELIVERED">Levert</option>
                      <option value="COMPLETED">Fullført</option>
                      <option value="CANCELLED">Kansellert</option>
                      <option value="REFUNDED">Refundert</option>
                    </select>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>NB:</strong> Endring av status vil påvirke ordrebehandling og regnskap.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowStatusModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Avbryt
                    </button>
                    <button
                      onClick={handleUpdateStatus}
                      className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                    >
                      Oppdater status
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
