/**
 * E-commerce Service
 *
 * Comprehensive service for managing e-commerce functionality:
 * - Product Categories
 * - Product Variants
 * - Wishlists
 * - Product Reviews
 * - Discount Codes
 * - Guest Checkout
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// PRODUCT CATEGORIES
// ============================================

export interface CreateCategoryDTO {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: string;
  sortOrder?: number;
  metadata?: any;
}

export async function createCategory(tenantId: string, data: CreateCategoryDTO) {
  return prisma.productCategory.create({
    data: {
      tenantId,
      ...data
    },
    include: {
      parent: true,
      children: true
    }
  });
}

export async function getCategories(tenantId: string, activeOnly: boolean = true) {
  return prisma.productCategory.findMany({
    where: {
      tenantId,
      ...(activeOnly && { active: true })
    },
    include: {
      parent: true,
      children: true,
      _count: {
        select: { products: true }
      }
    },
    orderBy: { sortOrder: 'asc' }
  });
}

export async function getCategoryBySlug(tenantId: string, slug: string) {
  return prisma.productCategory.findUnique({
    where: {
      tenantId_slug: { tenantId, slug }
    },
    include: {
      parent: true,
      children: true,
      products: {
        include: {
          product: {
            include: {
              images: true,
              variants: true
            }
          }
        }
      }
    }
  });
}

export async function updateCategory(id: string, data: Partial<CreateCategoryDTO>) {
  return prisma.productCategory.update({
    where: { id },
    data,
    include: {
      parent: true,
      children: true
    }
  });
}

export async function deleteCategory(id: string) {
  return prisma.productCategory.delete({
    where: { id }
  });
}

// ============================================
// PRODUCT VARIANTS
// ============================================

export interface CreateVariantDTO {
  productId: string;
  name: string;
  sku?: string;
  price?: number;
  compareAtPrice?: number;
  stock?: number;
  trackInventory?: boolean;
  weight?: number;
  imageUrl?: string;
  sortOrder?: number;
  attributeValues?: string[]; // Array of attributeValueIds
  metadata?: any;
}

export async function createVariant(data: CreateVariantDTO) {
  const { attributeValues, ...variantData } = data;

  const variant = await prisma.productVariant.create({
    data: variantData
  });

  // Link attribute values if provided
  if (attributeValues && attributeValues.length > 0) {
    await prisma.productVariantAttribute.createMany({
      data: attributeValues.map(valueId => ({
        variantId: variant.id,
        attributeValueId: valueId
      }))
    });
  }

  return prisma.productVariant.findUnique({
    where: { id: variant.id },
    include: {
      attributeValues: {
        include: {
          attributeValue: {
            include: {
              attribute: true
            }
          }
        }
      }
    }
  });
}

export async function getVariantsByProduct(productId: string) {
  return prisma.productVariant.findMany({
    where: { productId, active: true },
    include: {
      attributeValues: {
        include: {
          attributeValue: {
            include: {
              attribute: true
            }
          }
        }
      }
    },
    orderBy: { sortOrder: 'asc' }
  });
}

export async function updateVariant(id: string, data: Partial<CreateVariantDTO>) {
  const { attributeValues, ...variantData } = data;

  const variant = await prisma.productVariant.update({
    where: { id },
    data: variantData
  });

  // Update attribute values if provided
  if (attributeValues) {
    // Delete existing
    await prisma.productVariantAttribute.deleteMany({
      where: { variantId: id }
    });

    // Create new
    if (attributeValues.length > 0) {
      await prisma.productVariantAttribute.createMany({
        data: attributeValues.map(valueId => ({
          variantId: id,
          attributeValueId: valueId
        }))
      });
    }
  }

  return prisma.productVariant.findUnique({
    where: { id },
    include: {
      attributeValues: {
        include: {
          attributeValue: {
            include: {
              attribute: true
            }
          }
        }
      }
    }
  });
}

export async function deleteVariant(id: string) {
  return prisma.productVariant.delete({
    where: { id }
  });
}

// ============================================
// PRODUCT ATTRIBUTES
// ============================================

export interface CreateAttributeDTO {
  tenantId: string;
  name: string;
  slug: string;
  type?: string;
  sortOrder?: number;
}

export interface CreateAttributeValueDTO {
  attributeId: string;
  value: string;
  displayName?: string;
  colorCode?: string;
  sortOrder?: number;
}

export async function createAttribute(data: CreateAttributeDTO) {
  return prisma.productAttribute.create({
    data
  });
}

export async function getAttributes(tenantId: string) {
  return prisma.productAttribute.findMany({
    where: { tenantId, active: true },
    include: {
      values: {
        where: { active: true },
        orderBy: { sortOrder: 'asc' }
      }
    },
    orderBy: { sortOrder: 'asc' }
  });
}

export async function createAttributeValue(data: CreateAttributeValueDTO) {
  return prisma.productAttributeValue.create({
    data,
    include: {
      attribute: true
    }
  });
}

// ============================================
// WISHLIST
// ============================================

export async function getOrCreateWishlist(tenantId: string, userId: string) {
  let wishlist = await prisma.wishlist.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: true,
              variants: true
            }
          },
          variant: true
        }
      }
    }
  });

  if (!wishlist) {
    wishlist = await prisma.wishlist.create({
      data: {
        tenantId,
        userId
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
                variants: true
              }
            },
            variant: true
          }
        }
      }
    });
  }

  return wishlist;
}

export async function addToWishlist(
  wishlistId: string,
  productId: string,
  variantId?: string,
  notes?: string
) {
  // Check if already in wishlist
  const existing = await prisma.wishlistItem.findFirst({
    where: {
      wishlistId,
      productId,
      variantId: variantId || null
    }
  });

  if (existing) {
    return existing;
  }

  return prisma.wishlistItem.create({
    data: {
      wishlistId,
      productId,
      variantId,
      notes
    },
    include: {
      product: {
        include: {
          images: true
        }
      },
      variant: true
    }
  });
}

export async function removeFromWishlist(itemId: string) {
  return prisma.wishlistItem.delete({
    where: { id: itemId }
  });
}

// ============================================
// PRODUCT REVIEWS
// ============================================

export interface CreateReviewDTO {
  tenantId: string;
  productId: string;
  userId: string;
  rating: number;
  title?: string;
  comment: string;
  verified?: boolean;
}

export async function createReview(data: CreateReviewDTO) {
  // Check if user already reviewed this product
  const existing = await prisma.productReview.findUnique({
    where: {
      productId_userId: {
        productId: data.productId,
        userId: data.userId
      }
    }
  });

  if (existing) {
    throw new Error('Du har allerede anmeldt dette produktet');
  }

  return prisma.productReview.create({
    data: {
      ...data,
      status: 'PENDING' // Requires moderation
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true
        }
      }
    }
  });
}

export async function getProductReviews(productId: string, includeAll: boolean = false) {
  return prisma.productReview.findMany({
    where: {
      productId,
      ...(includeAll ? {} : { status: 'APPROVED' })
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getProductRating(productId: string) {
  const reviews = await prisma.productReview.findMany({
    where: {
      productId,
      status: 'APPROVED'
    },
    select: {
      rating: true
    }
  });

  if (reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }

  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  const average = total / reviews.length;

  const distribution = reviews.reduce((acc, r) => {
    acc[r.rating] = (acc[r.rating] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  return {
    averageRating: Math.round(average * 10) / 10,
    totalReviews: reviews.length,
    distribution
  };
}

export async function moderateReview(reviewId: string, status: 'APPROVED' | 'REJECTED' | 'FLAGGED', moderatorId: string) {
  return prisma.productReview.update({
    where: { id: reviewId },
    data: {
      status,
      moderatedBy: moderatorId,
      moderatedAt: new Date()
    }
  });
}

export async function voteReviewHelpful(reviewId: string, helpful: boolean) {
  return prisma.productReview.update({
    where: { id: reviewId },
    data: {
      ...(helpful
        ? { helpful: { increment: 1 } }
        : { notHelpful: { increment: 1 } }
      )
    }
  });
}

// ============================================
// DISCOUNT CODES
// ============================================

export interface CreateDiscountCodeDTO {
  tenantId: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING' | 'BUY_X_GET_Y';
  value: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  perUserLimit?: number;
  startDate: Date;
  endDate?: Date;
  description?: string;
  applicableToAll?: boolean;
  categoryIds?: string[];
  productIds?: string[];
}

export async function createDiscountCode(data: CreateDiscountCodeDTO) {
  return prisma.discountCode.create({
    data
  });
}

export async function validateDiscountCode(
  tenantId: string,
  code: string,
  userId: string,
  orderAmount: number,
  productIds: string[]
) {
  const discount = await prisma.discountCode.findUnique({
    where: { tenantId_code: { tenantId, code } }
  });

  if (!discount) {
    throw new Error('Ugyldig rabattkode');
  }

  if (!discount.active) {
    throw new Error('Rabattkoden er ikke aktiv');
  }

  const now = new Date();
  if (now < discount.startDate) {
    throw new Error('Rabattkoden er ikke gyldig ennå');
  }

  if (discount.endDate && now > discount.endDate) {
    throw new Error('Rabattkoden er utløpt');
  }

  if (discount.minOrderAmount && orderAmount < discount.minOrderAmount) {
    throw new Error(`Minimumsbeløp for rabattkode er ${discount.minOrderAmount} NOK`);
  }

  if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
    throw new Error('Rabattkoden har nådd maksimalt antall bruk');
  }

  if (discount.perUserLimit) {
    const userUsageCount = await prisma.discountCodeUsage.count({
      where: {
        codeId: discount.id,
        userId
      }
    });

    if (userUsageCount >= discount.perUserLimit) {
      throw new Error('Du har allerede brukt denne rabattkoden maksimalt antall ganger');
    }
  }

  // Check product/category applicability
  if (!discount.applicableToAll) {
    const applicable = productIds.some(pid => discount.productIds.includes(pid));
    if (!applicable) {
      throw new Error('Rabattkoden gjelder ikke for produktene i handlekurven');
    }
  }

  return discount;
}

export async function calculateDiscount(
  discount: any,
  orderAmount: number
): Promise<number> {
  let discountAmount = 0;

  switch (discount.type) {
    case 'PERCENTAGE':
      discountAmount = (orderAmount * discount.value) / 100;
      break;
    case 'FIXED_AMOUNT':
      discountAmount = discount.value;
      break;
    case 'FREE_SHIPPING':
      // Shipping cost should be handled in order calculation
      discountAmount = 0;
      break;
    case 'BUY_X_GET_Y':
      // Complex logic - implement based on business rules
      discountAmount = 0;
      break;
  }

  // Apply max discount cap if set
  if (discount.maxDiscountAmount && discountAmount > discount.maxDiscountAmount) {
    discountAmount = discount.maxDiscountAmount;
  }

  // Don't allow discount to exceed order amount
  if (discountAmount > orderAmount) {
    discountAmount = orderAmount;
  }

  return discountAmount;
}

export async function applyDiscountCode(
  orderId: string,
  discountCodeId: string,
  userId: string,
  discountAmount: number
) {
  // Create usage record
  await prisma.discountCodeUsage.create({
    data: {
      codeId: discountCodeId,
      userId,
      orderId
    }
  });

  // Create order discount
  await prisma.orderDiscount.create({
    data: {
      orderId,
      discountCodeId,
      discountAmount
    }
  });

  // Increment usage count
  await prisma.discountCode.update({
    where: { id: discountCodeId },
    data: {
      usageCount: { increment: 1 }
    }
  });
}

export async function getDiscountCodes(tenantId: string, activeOnly: boolean = true) {
  const now = new Date();

  return prisma.discountCode.findMany({
    where: {
      tenantId,
      ...(activeOnly && {
        active: true,
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } }
        ]
      })
    },
    orderBy: { createdAt: 'desc' }
  });
}

// ============================================
// GUEST CHECKOUT
// ============================================

export interface CreateGuestCheckoutDTO {
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  sessionId: string;
  address?: string;
  city?: string;
  zip?: string;
  country?: string;
}

export async function createGuestCheckout(data: CreateGuestCheckoutDTO) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour session

  return prisma.guestCheckout.create({
    data: {
      ...data,
      expiresAt
    }
  });
}

export async function getGuestCheckout(sessionId: string) {
  return prisma.guestCheckout.findUnique({
    where: { sessionId },
    include: {
      order: true
    }
  });
}

export async function convertGuestToUser(guestCheckoutId: string, userId: string) {
  return prisma.guestCheckout.update({
    where: { id: guestCheckoutId },
    data: {
      convertedToUser: true,
      userId
    }
  });
}

// ============================================
// PRODUCT COLLECTIONS
// ============================================

export interface CreateCollectionDTO {
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  type?: 'MANUAL' | 'AUTO';
  conditions?: any;
  sortOrder?: number;
  startDate?: Date;
  endDate?: Date;
}

export async function createCollection(data: CreateCollectionDTO) {
  return prisma.productCollection.create({
    data
  });
}

export async function getCollections(tenantId: string, activeOnly: boolean = true) {
  const now = new Date();

  return prisma.productCollection.findMany({
    where: {
      tenantId,
      ...(activeOnly && {
        active: true,
        OR: [
          { startDate: null },
          { startDate: { lte: now } }
        ],
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } }
            ]
          }
        ]
      })
    },
    include: {
      _count: {
        select: { products: true }
      }
    },
    orderBy: { sortOrder: 'asc' }
  });
}

export async function addProductToCollection(collectionId: string, productId: string, sortOrder?: number) {
  return prisma.productCollectionMapping.create({
    data: {
      collectionId,
      productId,
      sortOrder: sortOrder || 0
    }
  });
}

export async function removeProductFromCollection(collectionId: string, productId: string) {
  return prisma.productCollectionMapping.delete({
    where: {
      collectionId_productId: {
        collectionId,
        productId
      }
    }
  });
}
