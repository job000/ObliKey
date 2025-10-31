/**
 * E-commerce Controller
 *
 * Handles all e-commerce related endpoints:
 * - Product Categories
 * - Product Variants & Attributes
 * - Wishlists
 * - Product Reviews
 * - Discount Codes
 * - Product Collections
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import * as EcommerceService from '../services/ecommerce.service';

export class EcommerceController {
  // ============================================
  // PRODUCT CATEGORIES
  // ============================================

  async getCategories(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const activeOnly = req.query.activeOnly !== 'false';

      const categories = await EcommerceService.getCategories(tenantId, activeOnly);

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 400);
      }
      throw new AppError('Kunne ikke hente kategorier', 500);
    }
  }

  async getCategoryBySlug(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { slug } = req.params;

      const category = await EcommerceService.getCategoryBySlug(tenantId, slug);

      if (!category) {
        throw new AppError('Kategori ikke funnet', 404);
      }

      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof Error) {
        throw new AppError(error.message, 400);
      }
      throw new AppError('Kunne ikke hente kategori', 500);
    }
  }

  async createCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const data = req.body;

      const category = await EcommerceService.createCategory(tenantId, data);

      res.status(201).json({
        success: true,
        data: category
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 400);
      }
      throw new AppError('Kunne ikke opprette kategori', 500);
    }
  }

  async updateCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body;

      const category = await EcommerceService.updateCategory(id, data);

      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 400);
      }
      throw new AppError('Kunne ikke oppdatere kategori', 500);
    }
  }

  async deleteCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await EcommerceService.deleteCategory(id);

      res.json({
        success: true,
        message: 'Kategori slettet'
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 400);
      }
      throw new AppError('Kunne ikke slette kategori', 500);
    }
  }

  // ============================================
  // PRODUCT VARIANTS
  // ============================================

  async getProductVariants(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { productId } = req.params;

      const variants = await EcommerceService.getVariantsByProduct(productId);

      res.json({
        success: true,
        data: variants
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 400);
      }
      throw new AppError('Kunne ikke hente varianter', 500);
    }
  }

  async createVariant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = req.body;

      const variant = await EcommerceService.createVariant(data);

      res.status(201).json({
        success: true,
        data: variant
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 400);
      }
      throw new AppError('Kunne ikke opprette variant', 500);
    }
  }

  async updateVariant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body;

      const variant = await EcommerceService.updateVariant(id, data);

      res.json({
        success: true,
        data: variant
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 400);
      }
      throw new AppError('Kunne ikke oppdatere variant', 500);
    }
  }

  async deleteVariant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await EcommerceService.deleteVariant(id);

      res.json({
        success: true,
        message: 'Variant slettet'
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 400);
      }
      throw new AppError('Kunne ikke slette variant', 500);
    }
  }

  // ============================================
  // PRODUCT ATTRIBUTES
  // ============================================

  async getAttributes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;

      const attributes = await EcommerceService.getAttributes(tenantId);

      res.json({
        success: true,
        data: attributes
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 400);
      }
      throw new AppError('Kunne ikke hente attributter', 500);
    }
  }

  async createAttribute(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const data = { ...req.body, tenantId };

      const attribute = await EcommerceService.createAttribute(data);

      res.status(201).json({
        success: true,
        data: attribute
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 400);
      }
      throw new AppError('Kunne ikke opprette attributt', 500);
    }
  }

  async createAttributeValue(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = req.body;

      const attributeValue = await EcommerceService.createAttributeValue(data);

      res.status(201).json({
        success: true,
        data: attributeValue
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 400);
      }
      throw new AppError('Kunne ikke opprette attributtverdi', 500);
    }
  }

  // ============================================
  // WISHLIST
  // ============================================

  async getWishlist(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;

      const wishlist = await EcommerceService.getOrCreateWishlist(tenantId, userId);

      res.json({
        success: true,
        data: wishlist
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 400);
      }
      throw new AppError('Kunne ikke hente wishlist', 500);
    }
  }

  async addToWishlist(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const { productId, variantId, notes } = req.body;

      const wishlist = await EcommerceService.getOrCreateWishlist(tenantId, userId);
      const item = await EcommerceService.addToWishlist(wishlist.id, productId, variantId, notes);

      res.status(201).json({
        success: true,
        data: item
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 400);
      }
      throw new AppError('Kunne ikke legge til i wishlist', 500);
    }
  }

  async removeFromWishlist(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { itemId } = req.params;

      await EcommerceService.removeFromWishlist(itemId);

      res.json({
        success: true,
        message: 'Fjernet fra wishlist'
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 400);
      }
      throw new AppError('Kunne ikke fjerne fra wishlist', 500);
    }
  }

  // ============================================
  // PRODUCT REVIEWS
  // ============================================

  async getAllReviews(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const status = req.query.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED' | undefined;

      const reviews = await EcommerceService.getAllReviews(tenantId, status);

      res.json({
        success: true,
        data: reviews
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 400);
      }
      throw new AppError('Kunne ikke hente anmeldelser', 500);
    }
  }

  async getProductReviews(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      const includeAll = req.query.includeAll === 'true';

      const reviews = await EcommerceService.getProductReviews(productId, includeAll);
      const rating = await EcommerceService.getProductRating(productId);

      res.json({
        success: true,
        data: {
          reviews,
          rating
        }
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 400);
      }
      throw new AppError('Kunne ikke hente anmeldelser', 500);
    }
  }

  async createReview(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const { productId, rating, title, comment } = req.body;

      if (!productId || !rating || !comment) {
        throw new AppError('ProductId, rating og kommentar er påkrevd', 400);
      }

      if (rating < 1 || rating > 5) {
        throw new AppError('Rating må være mellom 1 og 5', 400);
      }

      const review = await EcommerceService.createReview({
        tenantId,
        productId,
        userId,
        rating,
        title,
        comment
      });

      res.status(201).json({
        success: true,
        data: review,
        message: 'Anmeldelse sendt til godkjenning'
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 400);
      }
      throw new AppError('Kunne ikke opprette anmeldelse', 500);
    }
  }

  async moderateReview(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { reviewId } = req.params;
      const { status } = req.body;
      const moderatorId = req.user!.userId;

      if (!['APPROVED', 'REJECTED', 'FLAGGED'].includes(status)) {
        throw new AppError('Ugyldig status', 400);
      }

      const review = await EcommerceService.moderateReview(reviewId, status, moderatorId);

      res.json({
        success: true,
        data: review
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 400);
      }
      throw new AppError('Kunne ikke moderere anmeldelse', 500);
    }
  }

  async voteReviewHelpful(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { reviewId } = req.params;
      const { helpful } = req.body;

      const review = await EcommerceService.voteReviewHelpful(reviewId, helpful);

      res.json({
        success: true,
        data: review
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 400);
      }
      throw new AppError('Kunne ikke stemme på anmeldelse', 500);
    }
  }

  // ============================================
  // DISCOUNT CODES
  // ============================================

  async getDiscountCodes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const activeOnly = req.query.activeOnly !== 'false';

      const discountCodes = await EcommerceService.getDiscountCodes(tenantId, activeOnly);

      res.json({
        success: true,
        data: discountCodes
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 400);
      }
      throw new AppError('Kunne ikke hente rabattkoder', 500);
    }
  }

  async createDiscountCode(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const data = { ...req.body, tenantId };

      const discountCode = await EcommerceService.createDiscountCode(data);

      res.status(201).json({
        success: true,
        data: discountCode
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 400);
      }
      throw new AppError('Kunne ikke opprette rabattkode', 500);
    }
  }

  async validateDiscountCode(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const { code, orderAmount, productIds } = req.body;

      const discount = await EcommerceService.validateDiscountCode(
        tenantId,
        code,
        userId,
        orderAmount,
        productIds
      );

      const discountAmount = await EcommerceService.calculateDiscount(discount, orderAmount);

      res.json({
        success: true,
        data: {
          discount,
          discountAmount,
          finalAmount: orderAmount - discountAmount
        }
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 400);
      }
      throw new AppError('Kunne ikke validere rabattkode', 500);
    }
  }

  // ============================================
  // PRODUCT COLLECTIONS
  // ============================================

  async getCollections(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const activeOnly = req.query.activeOnly !== 'false';

      const collections = await EcommerceService.getCollections(tenantId, activeOnly);

      res.json({
        success: true,
        data: collections
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 400);
      }
      throw new AppError('Kunne ikke hente kolleksjoner', 500);
    }
  }

  async createCollection(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const data = { ...req.body, tenantId };

      const collection = await EcommerceService.createCollection(data);

      res.status(201).json({
        success: true,
        data: collection
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 400);
      }
      throw new AppError('Kunne ikke opprette kolleksjon', 500);
    }
  }

  async addProductToCollection(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { collectionId, productId } = req.body;
      const { sortOrder } = req.body;

      const mapping = await EcommerceService.addProductToCollection(collectionId, productId, sortOrder);

      res.status(201).json({
        success: true,
        data: mapping
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 400);
      }
      throw new AppError('Kunne ikke legge til produkt i kolleksjon', 500);
    }
  }

  async removeProductFromCollection(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { collectionId, productId } = req.params;

      await EcommerceService.removeProductFromCollection(collectionId, productId);

      res.json({
        success: true,
        message: 'Produkt fjernet fra kolleksjon'
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 400);
      }
      throw new AppError('Kunne ikke fjerne produkt fra kolleksjon', 500);
    }
  }
}
