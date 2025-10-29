import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CheckoutPage from '../pages/CheckoutPage';

// Mock the API module
vi.mock('../api/api', () => ({
  default: {
    createOrder: vi.fn(),
  },
}));

// Mock useAuth hook
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    },
    isAuthenticated: true,
  }),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      state: {
        orderItems: [
          {
            id: '1',
            name: 'Test Product',
            price: 299,
            quantity: 2,
          },
        ],
      },
    }),
  };
});

const renderCheckoutPage = () => {
  return render(
    <BrowserRouter>
      <CheckoutPage />
    </BrowserRouter>
  );
};

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render checkout page', () => {
    renderCheckoutPage();
    expect(screen.getByText(/Checkout/i)).toBeInTheDocument();
  });

  it('should display payment method options', () => {
    renderCheckoutPage();
    expect(screen.getByText(/Kortbetaling/i)).toBeInTheDocument();
    expect(screen.getByText(/Vipps/i)).toBeInTheDocument();
  });

  it('should show order summary', () => {
    renderCheckoutPage();
    expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
  });

  it('should calculate total price correctly', () => {
    renderCheckoutPage();
    // 2 items × 299 = 598
    expect(screen.getByText(/598/)).toBeInTheDocument();
  });

  it('should allow selecting card payment method', () => {
    renderCheckoutPage();
    const cardOption = screen.getByLabelText(/Kortbetaling/i);
    fireEvent.click(cardOption);
    expect(cardOption).toBeChecked();
  });

  it('should allow selecting Vipps payment method', () => {
    renderCheckoutPage();
    const vippsOption = screen.getByLabelText(/Vipps/i);
    fireEvent.click(vippsOption);
    expect(vippsOption).toBeChecked();
  });

  it('should show card form when card payment is selected', () => {
    renderCheckoutPage();
    const cardOption = screen.getByLabelText(/Kortbetaling/i);
    fireEvent.click(cardOption);
    expect(screen.getByPlaceholderText(/1234 5678 9012 3456/i)).toBeInTheDocument();
  });

  it('should validate card number format', async () => {
    renderCheckoutPage();
    const cardOption = screen.getByLabelText(/Kortbetaling/i);
    fireEvent.click(cardOption);

    const cardNumberInput = screen.getByPlaceholderText(/1234 5678 9012 3456/i);
    fireEvent.change(cardNumberInput, { target: { value: '4111111111111111' } });

    // Card number should be formatted with spaces
    expect(cardNumberInput).toHaveValue('4111 1111 1111 1111');
  });

  it('should validate expiry date format', async () => {
    renderCheckoutPage();
    const cardOption = screen.getByLabelText(/Kortbetaling/i);
    fireEvent.click(cardOption);

    const expiryInput = screen.getByPlaceholderText(/MM\/YY/i);
    fireEvent.change(expiryInput, { target: { value: '1225' } });

    // Should format as MM/YY
    expect(expiryInput).toHaveValue('12/25');
  });

  it('should validate CVV length', async () => {
    renderCheckoutPage();
    const cardOption = screen.getByLabelText(/Kortbetaling/i);
    fireEvent.click(cardOption);

    const cvvInput = screen.getByPlaceholderText(/123/i);
    fireEvent.change(cvvInput, { target: { value: '1234' } });

    // CVV should be limited to 3 digits
    expect(cvvInput.value.length).toBeLessThanOrEqual(3);
  });

  it('should display user contact information', () => {
    renderCheckoutPage();
    expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
  });

  it('should show pay button', () => {
    renderCheckoutPage();
    expect(screen.getByRole('button', { name: /Betal/i })).toBeInTheDocument();
  });

  it('should disable pay button when form is invalid', () => {
    renderCheckoutPage();
    const cardOption = screen.getByLabelText(/Kortbetaling/i);
    fireEvent.click(cardOption);

    const payButton = screen.getByRole('button', { name: /Betal/i });

    // Without filling the form, button should be disabled
    expect(payButton).toBeDisabled();
  });

  it('should enable pay button when form is valid', async () => {
    renderCheckoutPage();
    const cardOption = screen.getByLabelText(/Kortbetaling/i);
    fireEvent.click(cardOption);

    // Fill in all required fields
    const cardNumberInput = screen.getByPlaceholderText(/1234 5678 9012 3456/i);
    const expiryInput = screen.getByPlaceholderText(/MM\/YY/i);
    const cvvInput = screen.getByPlaceholderText(/123/i);
    const nameInput = screen.getByPlaceholderText(/John Doe/i);

    fireEvent.change(cardNumberInput, { target: { value: '4111111111111111' } });
    fireEvent.change(expiryInput, { target: { value: '1225' } });
    fireEvent.change(cvvInput, { target: { value: '123' } });
    fireEvent.change(nameInput, { target: { value: 'Test User' } });

    const payButton = screen.getByRole('button', { name: /Betal/i });

    await waitFor(() => {
      expect(payButton).not.toBeDisabled();
    });
  });

  it('should handle successful payment', async () => {
    const mockCreateOrder = vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'order-123' },
    });

    const api = await import('../api/api');
    api.default.createOrder = mockCreateOrder;

    renderCheckoutPage();

    const cardOption = screen.getByLabelText(/Kortbetaling/i);
    fireEvent.click(cardOption);

    // Fill form
    const cardNumberInput = screen.getByPlaceholderText(/1234 5678 9012 3456/i);
    const expiryInput = screen.getByPlaceholderText(/MM\/YY/i);
    const cvvInput = screen.getByPlaceholderText(/123/i);
    const nameInput = screen.getByPlaceholderText(/John Doe/i);

    fireEvent.change(cardNumberInput, { target: { value: '4111111111111111' } });
    fireEvent.change(expiryInput, { target: { value: '1225' } });
    fireEvent.change(cvvInput, { target: { value: '123' } });
    fireEvent.change(nameInput, { target: { value: 'Test User' } });

    const payButton = screen.getByRole('button', { name: /Betal/i });
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalledWith({
        items: expect.any(Array),
        paymentMethod: 'CARD',
      });
    });
  });

  it('should show loading state during payment processing', async () => {
    renderCheckoutPage();

    const cardOption = screen.getByLabelText(/Kortbetaling/i);
    fireEvent.click(cardOption);

    // Fill form
    const cardNumberInput = screen.getByPlaceholderText(/1234 5678 9012 3456/i);
    fireEvent.change(cardNumberInput, { target: { value: '4111111111111111' } });
    // ... fill other fields

    const payButton = screen.getByRole('button', { name: /Betal/i });
    fireEvent.click(payButton);

    // Should show loading state
    expect(screen.getByText(/Behandler.../i)).toBeInTheDocument();
  });

  it('should handle payment errors gracefully', async () => {
    const mockCreateOrder = vi.fn().mockRejectedValue(new Error('Payment failed'));

    const api = await import('../api/api');
    api.default.createOrder = mockCreateOrder;

    renderCheckoutPage();

    const cardOption = screen.getByLabelText(/Kortbetaling/i);
    fireEvent.click(cardOption);

    // Fill and submit form
    const payButton = screen.getByRole('button', { name: /Betal/i });
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(screen.getByText(/feil/i)).toBeInTheDocument();
    });
  });

  it('should open Vipps window when Vipps payment is selected', async () => {
    global.open = vi.fn();

    renderCheckoutPage();

    const vippsOption = screen.getByLabelText(/Vipps/i);
    fireEvent.click(vippsOption);

    const payButton = screen.getByRole('button', { name: /Betal/i });
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(global.open).toHaveBeenCalledWith(expect.stringContaining('vipps'), '_blank');
    });
  });
});
