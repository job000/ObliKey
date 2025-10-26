import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { X, Plus, Trash2 } from 'lucide-react';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: string;
  productId?: string;
}

export default function InvoiceModal({ isOpen, onClose, onSuccess }: InvoiceModalProps) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    customerEmail: '',
    customerAddress: '',
    customerVatNumber: '',
    dueDate: '',
    notes: '',
    paymentTerms: 'Betalingsfrist 14 dager',
  });

  const [lines, setLines] = useState<InvoiceLine[]>([
    { description: '', quantity: 1, unitPrice: 0, vatRate: 'RATE_25', productId: '' }
  ]);

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
      loadProducts();
    }
  }, [isOpen]);

  const loadCustomers = async () => {
    try {
      const response = await api.getUsers({ role: 'CUSTOMER' });
      if (response.success) {
        setCustomers(response.data);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await api.getProducts();
      if (response.success) {
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setFormData({
        ...formData,
        customerId,
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerEmail: customer.email || '',
      });
    }
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const newLines = [...lines];
      newLines[index] = {
        ...newLines[index],
        productId,
        description: product.name,
        unitPrice: product.price,
      };
      setLines(newLines);
    }
  };

  const addLine = () => {
    setLines([...lines, { description: '', quantity: 1, unitPrice: 0, vatRate: 'RATE_25', productId: '' }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      const newLines = lines.filter((_, i) => i !== index);
      setLines(newLines);
    }
  };

  const updateLine = (index: number, field: keyof InvoiceLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const calculateLineTotal = (line: InvoiceLine) => {
    const subtotal = line.quantity * line.unitPrice;
    const vatRates: any = {
      'RATE_25': 0.25,
      'RATE_15': 0.15,
      'RATE_12': 0.12,
      'RATE_0': 0,
      'EXEMPT': 0
    };
    const vatAmount = subtotal * (vatRates[line.vatRate] || 0);
    return subtotal + vatAmount;
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let vatAmount = 0;

    lines.forEach(line => {
      const lineSubtotal = line.quantity * line.unitPrice;
      const vatRates: any = {
        'RATE_25': 0.25,
        'RATE_15': 0.15,
        'RATE_12': 0.12,
        'RATE_0': 0,
        'EXEMPT': 0
      };
      const lineVatAmount = lineSubtotal * (vatRates[line.vatRate] || 0);

      subtotal += lineSubtotal;
      vatAmount += lineVatAmount;
    });

    return { subtotal, vatAmount, total: subtotal + vatAmount };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName) {
      alert('Vennligst fyll inn kundenavn');
      return;
    }

    if (!formData.dueDate) {
      alert('Vennligst velg forfallsdato');
      return;
    }

    if (lines.length === 0) {
      alert('Vennligst legg til minst én fakturalinje');
      return;
    }

    // Validate lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.description) {
        alert(`Linje ${i + 1}: Beskrivelse er påkrevd`);
        return;
      }
      if (line.quantity <= 0) {
        alert(`Linje ${i + 1}: Antall må være større enn 0`);
        return;
      }
      if (line.unitPrice <= 0) {
        alert(`Linje ${i + 1}: Pris må være større enn 0`);
        return;
      }
    }

    setLoading(true);
    try {
      const invoiceData: any = {
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerAddress: formData.customerAddress,
        customerVatNumber: formData.customerVatNumber,
        dueDate: formData.dueDate,
        notes: formData.notes,
        paymentTerms: formData.paymentTerms,
        lines: lines.map(line => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          vatRate: line.vatRate,
          productId: line.productId || undefined
        }))
      };

      // Only add customerId if a customer was selected
      if (formData.customerId) {
        invoiceData.customerId = formData.customerId;
      }

      const response = await api.createInvoice(invoiceData);

      if (response.success) {
        alert('Faktura opprettet!');
        onSuccess();
        onClose();
        resetForm();
      } else {
        alert('Kunne ikke opprette faktura: ' + (response.error || 'Ukjent feil'));
      }
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Ukjent feil';
      alert('Kunne ikke opprette faktura: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customerId: '',
      customerName: '',
      customerEmail: '',
      customerAddress: '',
      customerVatNumber: '',
      dueDate: '',
      notes: '',
      paymentTerms: 'Betalingsfrist 14 dager',
    });
    setLines([{ description: '', quantity: 1, unitPrice: 0, vatRate: 'RATE_25', productId: '' }]);
  };

  const totals = calculateTotals();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Ny faktura</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4">
            <div className="space-y-6">
              {/* Customer Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Velg kunde
                  </label>
                  <select
                    value={formData.customerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Velg kunde...</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.firstName} {customer.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kundenavn *
                  </label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-post
                  </label>
                  <input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Forfallsdato *
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={formData.customerAddress}
                    onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Org.nr / MVA
                  </label>
                  <input
                    type="text"
                    value={formData.customerVatNumber}
                    onChange={(e) => setFormData({ ...formData, customerVatNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Invoice Lines */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Fakturalinjer *
                  </label>
                  <button
                    type="button"
                    onClick={addLine}
                    className="inline-flex items-center px-3 py-1 text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Legg til linje
                  </button>
                </div>

                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Produkt</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Beskrivelse</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Antall</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Pris</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">MVA</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Sum</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {lines.map((line, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2">
                              <select
                                value={line.productId}
                                onChange={(e) => handleProductChange(index, e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value="">Velg...</option>
                                {products.map((product) => (
                                  <option key={product.id} value={product.id}>
                                    {product.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={line.description}
                                onChange={(e) => updateLine(index, 'description', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="Beskrivelse"
                                required
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={line.quantity}
                                onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                min="0"
                                step="0.01"
                                required
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={line.unitPrice}
                                onChange={(e) => updateLine(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                min="0"
                                step="0.01"
                                required
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={line.vatRate}
                                onChange={(e) => updateLine(index, 'vatRate', e.target.value)}
                                className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value="RATE_25">25%</option>
                                <option value="RATE_15">15%</option>
                                <option value="RATE_12">12%</option>
                                <option value="RATE_0">0%</option>
                                <option value="EXEMPT">Fritatt</option>
                              </select>
                            </td>
                            <td className="px-3 py-2 text-sm font-medium text-gray-900">
                              {calculateLineTotal(line).toFixed(2)} kr
                            </td>
                            <td className="px-3 py-2">
                              {lines.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeLine(index)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals */}
                <div className="mt-4 flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">{totals.subtotal.toFixed(2)} kr</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">MVA:</span>
                      <span className="font-medium">{totals.vatAmount.toFixed(2)} kr</span>
                    </div>
                    <div className="flex justify-between text-base font-semibold border-t pt-2">
                      <span>Total:</span>
                      <span>{totals.total.toFixed(2)} kr</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Betalingsvilkår
                  </label>
                  <input
                    type="text"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Merknader
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                ></textarea>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Oppretter...' : 'Opprett faktura'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
