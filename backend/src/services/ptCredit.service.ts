import { prisma } from '../utils/prisma';

class PTCreditService {
  /**
   * Grant PT credits to user when order is completed
   * @param orderId - The order ID
   * @param userId - The user ID
   * @param tenantId - The tenant ID
   */
  async grantCreditsForOrder(orderId: string, userId: string, tenantId: string): Promise<void> {
    try {
      console.log(`[PTCredit] Processing credits for order ${orderId}`);

      // Get order with items and products
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // Check if credits already granted for this order
      const existingCredits = await prisma.pTCredit.findFirst({
        where: {
          orderId,
          tenantId
        }
      });

      if (existingCredits) {
        console.log(`[PTCredit] Credits already granted for order ${orderId}`);
        return;
      }

      // Process each PT_SERVICE item in the order
      for (const item of order.items) {
        if (item.product && item.product.type === 'PT_SERVICE' && item.product.sessionCount) {
          const totalCredits = item.product.sessionCount * item.quantity;

          // Calculate expiry date
          let expiryDate: Date | null = null;
          if (item.product.validityDays) {
            expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + item.product.validityDays);
          }

          // Create PT credit record
          await prisma.pTCredit.create({
            data: {
              tenantId,
              userId,
              orderId,
              credits: totalCredits,
              used: 0,
              expiryDate,
              notes: `Purchased ${item.product.name} - ${item.quantity}x ${item.product.sessionCount} credits`
            }
          });

          console.log(`[PTCredit] Granted ${totalCredits} credits to user ${userId} from product ${item.product.name}`);
        }
      }

      console.log(`[PTCredit] Successfully processed credits for order ${orderId}`);
    } catch (error) {
      console.error(`[PTCredit] Error granting credits for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's available PT credits
   * @param userId - The user ID
   * @param tenantId - The tenant ID
   * @returns Total available credits
   */
  async getUserAvailableCredits(userId: string, tenantId: string): Promise<number> {
    const credits = await prisma.pTCredit.findMany({
      where: {
        userId,
        tenantId,
        OR: [
          { expiryDate: null },
          { expiryDate: { gt: new Date() } }
        ]
      }
    });

    const totalAvailable = credits.reduce((sum, credit) => {
      return sum + (credit.credits - credit.used);
    }, 0);

    return totalAvailable;
  }

  /**
   * Use PT credits for a session
   * @param userId - The user ID
   * @param tenantId - The tenant ID
   * @param creditsToUse - Number of credits to use (usually 1 per session)
   * @returns Success status
   */
  async useCredits(userId: string, tenantId: string, creditsToUse: number = 1): Promise<boolean> {
    try {
      console.log(`[PTCredit] Using ${creditsToUse} credits for user ${userId}`);

      // Get available credit records (oldest first, FIFO)
      const creditRecords = await prisma.pTCredit.findMany({
        where: {
          userId,
          tenantId,
          OR: [
            { expiryDate: null },
            { expiryDate: { gt: new Date() } }
          ]
        },
        orderBy: {
          purchaseDate: 'asc' // Use oldest credits first
        }
      });

      let remainingToUse = creditsToUse;

      for (const record of creditRecords) {
        if (remainingToUse <= 0) break;

        const available = record.credits - record.used;
        if (available > 0) {
          const toUseFromThis = Math.min(available, remainingToUse);

          await prisma.pTCredit.update({
            where: { id: record.id },
            data: {
              used: record.used + toUseFromThis
            }
          });

          remainingToUse -= toUseFromThis;
          console.log(`[PTCredit] Used ${toUseFromThis} credits from record ${record.id}`);
        }
      }

      if (remainingToUse > 0) {
        throw new Error(`Insufficient credits. ${remainingToUse} credits still needed.`);
      }

      console.log(`[PTCredit] Successfully used ${creditsToUse} credits for user ${userId}`);
      return true;
    } catch (error) {
      console.error(`[PTCredit] Error using credits:`, error);
      throw error;
    }
  }

  /**
   * Get detailed credit information for user
   * @param userId - The user ID
   * @param tenantId - The tenant ID
   * @returns Array of credit records with details
   */
  async getUserCreditDetails(userId: string, tenantId: string) {
    const credits = await prisma.pTCredit.findMany({
      where: {
        userId,
        tenantId
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        purchaseDate: 'desc'
      }
    });

    return credits.map(credit => ({
      id: credit.id,
      total: credit.credits,
      used: credit.used,
      remaining: credit.credits - credit.used,
      purchaseDate: credit.purchaseDate,
      expiryDate: credit.expiryDate,
      isExpired: credit.expiryDate ? credit.expiryDate < new Date() : false,
      notes: credit.notes,
      order: credit.order
    }));
  }

  /**
   * Refund PT credits (e.g., when session is cancelled)
   * @param userId - The user ID
   * @param tenantId - The tenant ID
   * @param creditsToRefund - Number of credits to refund (usually 1 per session)
   * @returns Success status
   */
  async refundCredit(userId: string, tenantId: string, creditsToRefund: number = 1): Promise<boolean> {
    try {
      console.log(`[PTCredit] Refunding ${creditsToRefund} credits for user ${userId}`);

      // Get credit records with used credits (newest first, LIFO for refunds)
      const creditRecords = await prisma.pTCredit.findMany({
        where: {
          userId,
          tenantId,
          used: { gt: 0 } // Only records that have used credits
        },
        orderBy: {
          purchaseDate: 'desc' // Refund to newest purchases first
        }
      });

      if (creditRecords.length === 0) {
        console.warn(`[PTCredit] No used credits found for user ${userId} to refund`);
        return false;
      }

      let remainingToRefund = creditsToRefund;

      for (const record of creditRecords) {
        if (remainingToRefund <= 0) break;

        const toRefundFromThis = Math.min(record.used, remainingToRefund);

        await prisma.pTCredit.update({
          where: { id: record.id },
          data: {
            used: record.used - toRefundFromThis
          }
        });

        remainingToRefund -= toRefundFromThis;
        console.log(`[PTCredit] Refunded ${toRefundFromThis} credits to record ${record.id}`);
      }

      console.log(`[PTCredit] Successfully refunded ${creditsToRefund} credits for user ${userId}`);
      return true;
    } catch (error) {
      console.error(`[PTCredit] Error refunding credits:`, error);
      throw error;
    }
  }
}

export const ptCreditService = new PTCreditService();
