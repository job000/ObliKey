import { ReactNode, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { api } from '../services/api';
import {
  Home,
  Calendar,
  BookOpen,
  Dumbbell,
  FileText,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  ShoppingBag,
  ShoppingCart,
  Package,
  MessageSquare,
  Calculator,
  FileEdit,
  Activity,
  BarChart3,
  Receipt,
  Truck,
} from 'lucide-react';
import { useState } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [accountingEnabled, setAccountingEnabled] = useState(false);
  const [classesEnabled, setClassesEnabled] = useState(true); // Default to true
  const [chatEnabled, setChatEnabled] = useState(true); // Default to true
  const [landingPageEnabled, setLandingPageEnabled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Check if modules are enabled and load unread count
    const checkModuleStatus = async () => {
      try {
        // Check accounting module
        const accountingResponse = await api.getAccountingModuleStatus();
        if (accountingResponse.success) {
          setAccountingEnabled(accountingResponse.data.accountingEnabled);
        }

        // Check classes module
        const classesResponse = await api.getClassesModuleStatus();
        if (classesResponse.success) {
          setClassesEnabled(classesResponse.data.classesEnabled);
        }

        // Check chat module
        const chatResponse = await api.getChatModuleStatus();
        if (chatResponse.success) {
          setChatEnabled(chatResponse.data.chatEnabled);
        }

        // Check landing page module
        const landingPageResponse = await api.getLandingPageModuleStatus();
        if (landingPageResponse.success) {
          setLandingPageEnabled(landingPageResponse.data.landingPageEnabled);
        }

        // Load unread count for chat (only if chat is enabled)
        if (chatResponse.success && chatResponse.data.chatEnabled) {
          const unreadResponse = await api.getUnreadCount();
          if (unreadResponse.success) {
            setUnreadCount(unreadResponse.data.count);
          }
        }
      } catch (error) {
        console.error('Error checking module status:', error);
      }
    };

    if (user) {
      checkModuleStatus();

      // Refresh unread count every 10 seconds
      const interval = setInterval(() => {
        api.getUnreadCount().then((response) => {
          if (response.success) {
            setUnreadCount(response.data.count);
          }
        }).catch(console.error);
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['ADMIN', 'TRAINER', 'CUSTOMER'] },
    { name: 'Klasser', href: '/classes', icon: Calendar, roles: ['ADMIN', 'TRAINER', 'CUSTOMER'], requiresModule: 'classes' },
    { name: 'Mine Bookinger', href: '/bookings', icon: BookOpen, roles: ['CUSTOMER'] },
    { name: 'PT-Økter', href: '/pt-sessions', icon: Dumbbell, roles: ['ADMIN', 'TRAINER', 'CUSTOMER'] },
    { name: 'Treningsprogrammer', href: '/training-programs', icon: FileText, roles: ['TRAINER', 'CUSTOMER'] },
    { name: 'Butikk', href: '/shop', icon: ShoppingBag, roles: ['ADMIN', 'TRAINER', 'CUSTOMER'] },
    { name: 'Kjøpshistorikk', href: '/purchase-history', icon: Receipt, roles: ['ADMIN', 'TRAINER', 'CUSTOMER'] },
    { name: 'Chat', href: '/chat', icon: MessageSquare, roles: ['ADMIN', 'TRAINER', 'CUSTOMER'], requiresModule: 'chat' },
    { name: 'Admin', href: '/admin', icon: Settings, roles: ['ADMIN', 'SUPER_ADMIN'] },
    { name: 'Produkter', href: '/admin/products', icon: Package, roles: ['ADMIN', 'SUPER_ADMIN'] },
    { name: 'Bestillinger', href: '/admin/orders', icon: Truck, roles: ['ADMIN', 'SUPER_ADMIN'] },
    { name: 'Produktstatistikk', href: '/admin/product-analytics', icon: BarChart3, roles: ['ADMIN', 'SUPER_ADMIN'] },
    { name: 'Landingsside', href: '/admin/landing-page', icon: FileEdit, roles: ['ADMIN', 'SUPER_ADMIN'], requiresModule: 'landingPage' },
    { name: 'Aktivitetslogger', href: '/admin/activity-logs', icon: Activity, roles: ['ADMIN', 'SUPER_ADMIN'] },
    { name: 'Regnskap', href: '/accounting', icon: Calculator, roles: ['ADMIN', 'SUPER_ADMIN'], requiresModule: 'accounting' },
    { name: 'Profil', href: '/profile', icon: User, roles: ['ADMIN', 'TRAINER', 'CUSTOMER'] },
  ];

  const filteredNavigation = navigation.filter((item) => {
    // Check role access
    if (!item.roles.includes(user?.role || '')) {
      return false;
    }
    // Check if accounting module is required and enabled
    if (item.requiresModule === 'accounting' && !accountingEnabled) {
      return false;
    }
    // Check if classes module is required and enabled
    if (item.requiresModule === 'classes' && !classesEnabled) {
      return false;
    }
    // Check if chat module is required and enabled
    if (item.requiresModule === 'chat' && !chatEnabled) {
      return false;
    }
    // Check if landing page module is required and enabled
    if (item.requiresModule === 'landingPage' && !landingPageEnabled) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold text-primary-600 hover:text-primary-700 transition-colors cursor-pointer">
                ObliKey
              </Link>
              <span className="ml-4 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                {user?.role?.replace('_', ' ')}
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={() => setShowCartModal(true)}
                className="relative flex items-center text-gray-700 hover:text-primary-600"
              >
                <ShoppingCart className="w-6 h-6" />
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </button>

              {/* User Avatar and Name */}
              <Link to="/profile" className="flex items-center gap-2 hover:opacity-80">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={`${user.firstName} ${user.lastName}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-gray-500" />
                  )}
                </div>
                <span className="text-sm text-gray-700">
                  {user?.firstName} {user?.lastName}
                </span>
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center text-gray-700 hover:text-primary-600"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-700"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {filteredNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                const showBadge = item.name === 'Chat' && unreadCount > 0;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 rounded-md text-base font-medium ${
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon className="w-5 h-5 mr-3" />
                      {item.name}
                    </div>
                    {showBadge && (
                      <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Logg ut
              </button>
            </div>
          </div>
        )}
      </nav>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-64">
            <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {filteredNavigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  const showBadge = item.name === 'Chat' && unreadCount > 0;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md ${
                        isActive
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center">
                        <Icon
                          className={`mr-3 flex-shrink-0 h-6 w-6 ${
                            isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'
                          }`}
                        />
                        {item.name}
                      </div>
                      {showBadge && (
                        <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
        </main>
      </div>

      {/* Cart Modal */}
      {showCartModal && <CartModal onClose={() => setShowCartModal(false)} />}
    </div>
  );
}

// Cart Modal Component
const CartModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { items, removeItem, updateQuantity, clearCart, total } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (items.length === 0) {
      alert('Handlekurven er tom');
      return;
    }

    // Navigate to checkout page
    onClose();
    navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6" />
            Handlekurv
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Handlekurven er tom</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.productId} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                  {/* Product Image */}
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded"
                    />
                  )}

                  {/* Product Info */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-600">{item.type}</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">
                      {item.price.toLocaleString()} {item.currency}
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2 bg-white rounded border border-gray-300">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="px-2 py-1 hover:bg-gray-100"
                      >
                        -
                      </button>
                      <span className="px-3 font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="px-2 py-1 hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">
                      Sum: {(item.price * item.quantity).toLocaleString()} {item.currency}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold text-gray-900">Total:</span>
              <span className="text-2xl font-bold text-gray-900">
                {total.toLocaleString()} NOK
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={clearCart}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Tøm kurv
              </button>
              <button
                onClick={handleCheckout}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Gå til kasse
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
