import axios, { AxiosInstance } from 'axios';
import { prisma } from '../utils/prisma';
import { decryptCredentials, VippsCredentials } from '../utils/encryption';

interface VippsConfig {
  clientId: string;
  clientSecret: string;
  merchantSerialNumber: string;
  subscriptionKey: string;
}

export class VippsService {
  private api: AxiosInstance;
  private config: VippsConfig;
  private accessToken?: string;
  private tokenExpiry?: number;

  constructor(config: VippsConfig) {
    this.config = config;

    const baseURL = process.env.VIPPS_ENV === 'production'
      ? 'https://api.vipps.no'
      : 'https://apitest.vipps.no';

    this.api = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': config.subscriptionKey,
      },
    });
  }

  /**
   * Get access token (cached)
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await this.api.post('/accesstoken/get', null, {
      headers: {
        'client_id': this.config.clientId,
        'client_secret': this.config.clientSecret,
      },
    });

    this.accessToken = response.data.access_token;
    this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 min before expiry

    return this.accessToken;
  }

  /**
   * Initiate payment
   */
  async initiatePayment(params: {
    amount: number;
    phoneNumber: string;
    orderId: string;
    tenantId: string;
    userId: string;
    description: string;
    paymentType?: 'ORDER' | 'PT_SESSION' | 'MEMBERSHIP' | 'CLASS';
    orderDatabaseId?: string;
    callbackUrl?: string;
  }): Promise<{ url: string; orderId: string }> {
    const token = await this.getAccessToken();

    const response = await this.api.post(
      '/ecomm/v2/payments',
      {
        merchantInfo: {
          merchantSerialNumber: this.config.merchantSerialNumber,
          callbackPrefix: params.callbackUrl || process.env.VIPPS_CALLBACK_URL,
          fallBack: `${process.env.FRONTEND_URL}/payment/vipps/fallback`,
        },
        customerInfo: {
          mobileNumber: params.phoneNumber,
        },
        transaction: {
          orderId: params.orderId,
          amount: Math.round(params.amount * 100), // Convert to øre
          transactionText: params.description,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Merchant-Serial-Number': this.config.merchantSerialNumber,
        },
      }
    );

    // Store payment in database
    await prisma.payment.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        orderId: params.orderDatabaseId,
        amount: params.amount,
        currency: 'NOK',
        type: params.paymentType || 'ORDER',
        provider: 'VIPPS',
        method: 'VIPPS',
        status: 'PENDING',
        description: params.description,
        vippsOrderId: params.orderId,
        providerResponse: response.data,
      },
    });

    return {
      url: response.data.url,
      orderId: params.orderId,
    };
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(orderId: string): Promise<any> {
    const token = await this.getAccessToken();

    const response = await this.api.get(`/ecomm/v2/payments/${orderId}/details`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Merchant-Serial-Number': this.config.merchantSerialNumber,
      },
    });

    return response.data;
  }

  /**
   * Capture payment (for reserved payments)
   */
  async capturePayment(orderId: string, amount: number, description: string): Promise<any> {
    const token = await this.getAccessToken();

    const response = await this.api.post(
      `/ecomm/v2/payments/${orderId}/capture`,
      {
        merchantInfo: {
          merchantSerialNumber: this.config.merchantSerialNumber,
        },
        transaction: {
          amount: Math.round(amount * 100),
          transactionText: description,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Merchant-Serial-Number': this.config.merchantSerialNumber,
        },
      }
    );

    // Update payment in database
    await prisma.payment.updateMany({
      where: { vippsOrderId: orderId },
      data: {
        status: 'COMPLETED',
        paidAt: new Date(),
        providerResponse: response.data,
      },
    });

    return response.data;
  }

  /**
   * Cancel/Refund payment
   */
  async cancelPayment(orderId: string, description: string): Promise<any> {
    const token = await this.getAccessToken();

    const response = await this.api.put(
      `/ecomm/v2/payments/${orderId}/cancel`,
      {
        merchantInfo: {
          merchantSerialNumber: this.config.merchantSerialNumber,
        },
        transaction: {
          transactionText: description,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Merchant-Serial-Number': this.config.merchantSerialNumber,
        },
      }
    );

    // Update payment in database
    await prisma.payment.updateMany({
      where: { vippsOrderId: orderId },
      data: {
        status: 'REFUNDED',
        providerResponse: response.data,
      },
    });

    return response.data;
  }

  /**
   * Handle callback from Vipps
   */
  async handleCallback(orderId: string): Promise<void> {
    const details = await this.getPaymentDetails(orderId);

    const status = this.mapVippsStatus(details.transactionInfo.status);

    await prisma.payment.updateMany({
      where: { vippsOrderId: orderId },
      data: {
        status,
        providerResponse: details,
        ...(status === 'COMPLETED' && { paidAt: new Date() }),
      },
    });
  }

  private mapVippsStatus(vippsStatus: string): 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' {
    switch (vippsStatus) {
      case 'RESERVE':
      case 'SALE':
        return 'COMPLETED';
      case 'CANCEL':
      case 'VOID':
        return 'FAILED';
      case 'REFUND':
        return 'REFUNDED';
      default:
        return 'PENDING';
    }
  }
}

/**
 * Get Vipps service for a tenant
 */
export async function getVippsService(tenantId: string): Promise<VippsService | null> {
  const paymentConfig = await prisma.tenantPaymentConfig.findUnique({
    where: {
      tenantId_provider: {
        tenantId,
        provider: 'VIPPS',
      },
    },
  });

  if (!paymentConfig || !paymentConfig.enabled) {
    return null;
  }

  try {
    const credentials = decryptCredentials<VippsCredentials>(paymentConfig.credentialsEncrypted);

    return new VippsService({
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      merchantSerialNumber: credentials.merchantSerialNumber,
      subscriptionKey: credentials.subscriptionKey,
    });
  } catch (error) {
    console.error('Failed to decrypt Vipps credentials for tenant:', tenantId, error);
    return null;
  }
}
