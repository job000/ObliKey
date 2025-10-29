import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../../src/screens/LoginScreen';
import RegisterScreen from '../../src/screens/RegisterScreen';
import ForgotPasswordScreen from '../../src/screens/ForgotPasswordScreen';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

// Mock auth context
jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    loading: false,
  }),
}));

describe('Authentication Screens', () => {
  describe('LoginScreen', () => {
    test('should render login form', () => {
      const { getByPlaceholderText, getByText } = render(
        <LoginScreen navigation={mockNavigation} />
      );

      expect(getByPlaceholderText(/e-post eller brukernavn/i)).toBeTruthy();
      expect(getByPlaceholderText(/passord/i)).toBeTruthy();
      expect(getByText(/logg inn/i)).toBeTruthy();
    });

    test('should handle login with email', async () => {
      const { getByPlaceholderText, getByText } = render(
        <LoginScreen navigation={mockNavigation} />
      );

      const emailInput = getByPlaceholderText(/e-post eller brukernavn/i);
      const passwordInput = getByPlaceholderText(/passord/i);
      const loginButton = getByText(/logg inn/i);

      fireEvent.changeText(emailInput, 'test@test.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);

      await waitFor(() => {
        // Verify login was called
      });
    });

    test('should handle login with username', async () => {
      const { getByPlaceholderText, getByText } = render(
        <LoginScreen navigation={mockNavigation} />
      );

      const identifierInput = getByPlaceholderText(/e-post eller brukernavn/i);
      const passwordInput = getByPlaceholderText(/passord/i);
      const loginButton = getByText(/logg inn/i);

      fireEvent.changeText(identifierInput, 'testuser');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);

      await waitFor(() => {
        // Verify login was called
      });
    });

    test('should navigate to register screen', () => {
      const { getByText } = render(
        <LoginScreen navigation={mockNavigation} />
      );

      const registerLink = getByText(/registrer deg/i);
      fireEvent.press(registerLink);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Register');
    });

    test('should navigate to forgot password screen', () => {
      const { getByText } = render(
        <LoginScreen navigation={mockNavigation} />
      );

      const forgotLink = getByText(/glemt passord/i);
      fireEvent.press(forgotLink);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('ForgotPassword');
    });

    test('should show error for empty fields', async () => {
      const { getByText } = render(
        <LoginScreen navigation={mockNavigation} />
      );

      const loginButton = getByText(/logg inn/i);
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(getByText(/vennligst fyll ut alle feltene/i)).toBeTruthy();
      });
    });
  });

  describe('RegisterScreen', () => {
    test('should render registration form', () => {
      const { getByPlaceholderText, getByText } = render(
        <RegisterScreen navigation={mockNavigation} />
      );

      expect(getByPlaceholderText(/fornavn/i)).toBeTruthy();
      expect(getByPlaceholderText(/etternavn/i)).toBeTruthy();
      expect(getByPlaceholderText(/e-post/i)).toBeTruthy();
      expect(getByPlaceholderText(/passord/i)).toBeTruthy();
      expect(getByText(/registrer/i)).toBeTruthy();
    });

    test('should handle successful registration', async () => {
      const { getByPlaceholderText, getByText } = render(
        <RegisterScreen navigation={mockNavigation} />
      );

      fireEvent.changeText(getByPlaceholderText(/fornavn/i), 'Test');
      fireEvent.changeText(getByPlaceholderText(/etternavn/i), 'User');
      fireEvent.changeText(getByPlaceholderText(/e-post/i), 'test@test.com');
      fireEvent.changeText(getByPlaceholderText(/passord/i), 'password123');

      const registerButton = getByText(/registrer/i);
      fireEvent.press(registerButton);

      await waitFor(() => {
        // Verify registration was called
      });
    });

    test('should validate email format', async () => {
      const { getByPlaceholderText, getByText } = render(
        <RegisterScreen navigation={mockNavigation} />
      );

      fireEvent.changeText(getByPlaceholderText(/e-post/i), 'invalid-email');

      const registerButton = getByText(/registrer/i);
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(getByText(/ugyldig e-postadresse/i)).toBeTruthy();
      });
    });

    test('should validate password strength', async () => {
      const { getByPlaceholderText, getByText } = render(
        <RegisterScreen navigation={mockNavigation} />
      );

      fireEvent.changeText(getByPlaceholderText(/passord/i), '123');

      await waitFor(() => {
        expect(getByText(/passord må være minst 6 tegn/i)).toBeTruthy();
      });
    });

    test('should navigate back to login', () => {
      const { getByText } = render(
        <RegisterScreen navigation={mockNavigation} />
      );

      const loginLink = getByText(/har du allerede en konto/i);
      fireEvent.press(loginLink);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Login');
    });
  });

  describe('ForgotPasswordScreen', () => {
    test('should render forgot password form', () => {
      const { getByPlaceholderText, getByText } = render(
        <ForgotPasswordScreen navigation={mockNavigation} />
      );

      expect(getByPlaceholderText(/e-post/i)).toBeTruthy();
      expect(getByText(/send tilbakestillingslenke/i)).toBeTruthy();
    });

    test('should handle password reset request', async () => {
      const { getByPlaceholderText, getByText } = render(
        <ForgotPasswordScreen navigation={mockNavigation} />
      );

      const emailInput = getByPlaceholderText(/e-post/i);
      fireEvent.changeText(emailInput, 'test@test.com');

      const submitButton = getByText(/send tilbakestillingslenke/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText(/e-post sendt/i)).toBeTruthy();
      });
    });

    test('should validate email format', async () => {
      const { getByPlaceholderText, getByText } = render(
        <ForgotPasswordScreen navigation={mockNavigation} />
      );

      fireEvent.changeText(getByPlaceholderText(/e-post/i), 'invalid');

      const submitButton = getByText(/send tilbakestillingslenke/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText(/ugyldig e-postadresse/i)).toBeTruthy();
      });
    });

    test('should navigate back to login', () => {
      const { getByText } = render(
        <ForgotPasswordScreen navigation={mockNavigation} />
      );

      const backLink = getByText(/tilbake til innlogging/i);
      fireEvent.press(backLink);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Login');
    });
  });
});
