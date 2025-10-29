import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import {
  CreditCard,
  ShoppingCart,
  Check,
  AlertCircle,
  ArrowLeft,
  Lock,
  Package,
  User,
  Mail,
  Phone,
  MapPin,
  Building
} from 'lucide-react';
import { api } from '../services/api';

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'vipps' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'payment' | 'success'>('payment');

  // Card form state
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
  });

  // Billing info state (populated from user)
  const [billingInfo, setBillingInfo] = useState({
    email: user?.email || '',
    phone: user?.phone || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
  });

  if (items.length === 0 && step !== 'success') {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Handlekurven er tom</h2>
            <p className="text-gray-600 mb-6">Legg til produkter før du går til kassen</p>
            <button
              onClick={() => navigate('/shop')}
              className="btn btn-primary"
            >
              Gå til butikken
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g) || [];
    return chunks.join(' ').substr(0, 19); // Max 16 digits + 3 spaces
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substr(0, 2) + '/' + cleaned.substr(2, 2);
    }
    return cleaned;
  };

  const handleCardInputChange = (field: string, value: string) => {
    let formattedValue = value;

    if (field === 'cardNumber') {
      formattedValue = formatCardNumber(value);
    } else if (field === 'expiryDate') {
      formattedValue = formatExpiryDate(value);
    } else if (field === 'cvv') {
      formattedValue = value.replace(/\D/g, '').substr(0, 4);
    }

    setCardData({ ...cardData, [field]: formattedValue });
  };

  const validateCardForm = () => {
    if (!cardData.cardNumber || cardData.cardNumber.replace(/\s/g, '').length < 15) {
      setError('Vennligst fyll inn et gyldig kortnummer');
      return false;
    }
    if (!cardData.cardName) {
      setError('Vennligst fyll inn kortholders navn');
      return false;
    }
    if (!cardData.expiryDate || cardData.expiryDate.length < 5) {
      setError('Vennligst fyll inn utløpsdato');
      return false;
    }
    if (!cardData.cvv || cardData.cvv.length < 3) {
      setError('Vennligst fyll inn CVV');
      return false;
    }
    return true;
  };

  const handlePayment = async () => {
    setError('');

    if (!paymentMethod) {
      setError('Vennligst velg en betalingsmetode');
      return;
    }

    if (paymentMethod === 'card' && !validateCardForm()) {
      return;
    }

    setProcessing(true);

    try {
      // Create order
      const orderItems = items.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      }));

      const orderResponse = await api.createOrder({
        items: orderItems,
        paymentMethod: paymentMethod.toUpperCase()
      });

      if (orderResponse.success) {
        if (paymentMethod === 'vipps') {
          // Simulate Vipps redirect
          // In production, you would redirect to Vipps payment page
          window.open('https://www.vipps.no/', '_blank');

          // Simulate successful payment after 2 seconds
          setTimeout(() => {
            clearCart();
            setStep('success');
            setProcessing(false);
          }, 2000);
        } else {
          // Card payment processed
          clearCart();
          setStep('success');
        }
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setError(error.response?.data?.error || 'Betalingen feilet. Vennligst prøv igjen.');
      setProcessing(false);
    }
  };

  if (step === 'success') {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Bestilling bekreftet!</h2>
            <p className="text-gray-600 mb-2">Takk for din bestilling!</p>
            <p className="text-gray-600 mb-8">Du vil motta en bekreftelse på e-post.</p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <p className="text-blue-900 font-medium mb-2">
                PT-timer er nå tilgjengelige i din konto
              </p>
              <p className="text-blue-700 text-sm">
                Se dine tilgjengelige timer og book PT-økter under "PT-Økter"
              </p>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate('/pt-sessions')}
                className="btn btn-primary"
              >
                Se mine PT-timer
              </button>
              <button
                onClick={() => navigate('/shop')}
                className="btn btn-outline"
              >
                Fortsett å handle
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Tilbake
          </button>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Lock className="w-8 h-8 text-blue-600" />
            Sikker betaling
          </h1>
          <p className="text-gray-600 mt-2">Velg betalingsmetode og fullfør kjøpet</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Kontaktinformasjon
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    E-post
                  </label>
                  <input
                    type="email"
                    value={billingInfo.email}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={billingInfo.phone}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                Betalingsmetode
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Card Payment */}
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    paymentMethod === 'card'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <CreditCard className={`w-8 h-8 mb-3 ${
                    paymentMethod === 'card' ? 'text-blue-600' : 'text-gray-600'
                  }`} />
                  <h3 className="font-semibold text-gray-900 mb-1">Kort</h3>
                  <p className="text-sm text-gray-600">Visa, Mastercard, etc.</p>
                </button>

                {/* Vipps Payment */}
                <button
                  onClick={() => setPaymentMethod('vipps')}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    paymentMethod === 'vipps'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-8 h-8 mb-3 rounded font-bold flex items-center justify-center text-white ${
                    paymentMethod === 'vipps' ? 'bg-orange-600' : 'bg-orange-500'
                  }`}>
                    V
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Vipps</h3>
                  <p className="text-sm text-gray-600">Betal med Vipps</p>
                </button>
              </div>

              {/* Card Form */}
              {paymentMethod === 'card' && (
                <div className="space-y-4 pt-6 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kortnummer
                    </label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      value={cardData.cardNumber}
                      onChange={(e) => handleCardInputChange('cardNumber', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kortholders navn
                    </label>
                    <input
                      type="text"
                      placeholder="NAVN NAVNESEN"
                      value={cardData.cardName}
                      onChange={(e) => handleCardInputChange('cardName', e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Utløpsdato
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={cardData.expiryDate}
                        onChange={(e) => handleCardInputChange('expiryDate', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CVV
                      </label>
                      <input
                        type="text"
                        placeholder="123"
                        value={cardData.cvv}
                        onChange={(e) => handleCardInputChange('cvv', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Vipps Instructions */}
              {paymentMethod === 'vipps' && (
                <div className="pt-6 border-t border-gray-200">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-semibold text-orange-900 mb-2">Betaling med Vipps</h4>
                    <p className="text-sm text-orange-800">
                      Du vil bli videresendt til Vipps for å fullføre betalingen.
                      Åpne Vipps-appen på mobilen din og bekreft betalingen.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-800">{error}</p>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Ordresammendrag
              </h2>

              {/* Cart Items */}
              <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.productId} className="flex gap-3 pb-4 border-b border-gray-100 last:border-0">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm truncate">{item.name}</h4>
                      <p className="text-xs text-gray-600 mt-1">Antall: {item.quantity}</p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {(item.price * item.quantity).toLocaleString()} {item.currency}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 mb-6 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-gray-600">
                  <span>Delsum</span>
                  <span>{total.toLocaleString()} NOK</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>MVA (25%)</span>
                  <span>{(total * 0.25).toLocaleString()} NOK</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t border-gray-200">
                  <span>Totalt</span>
                  <span>{total.toLocaleString()} NOK</span>
                </div>
              </div>

              {/* Pay Button */}
              <button
                onClick={handlePayment}
                disabled={!paymentMethod || processing}
                className="w-full btn btn-primary btn-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Behandler...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Betal {total.toLocaleString()} NOK
                  </>
                )}
              </button>

              {/* Security Badge */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <Lock className="w-4 h-4" />
                  <span>Sikker betaling med 256-bit kryptering</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
