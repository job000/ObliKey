import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export class ProductController {
  // Create product (ADMIN only)
  async createProduct(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const {
        name,
        description,
        type,
        price,
        compareAtPrice,
        currency,
        sku,
        stock,
        trackInventory,
        sessionCount,
        validityDays,
        slug,
        featured,
        sortOrder,
        metadata
      } = req.body;

      // Validate required fields
      if (!name || !description || !type || price === undefined) {
        throw new AppError('Navn, beskrivelse, type og pris er påkrevd', 400);
      }

      // Check if slug already exists for this tenant
      if (slug) {
        const existingProduct = await prisma.product.findUnique({
          where: {
            tenantId_slug: {
              tenantId,
              slug
            }
          }
        });

        if (existingProduct) {
          throw new AppError('Slug eksisterer allerede', 400);
        }
      }

      // Create product
      const product = await prisma.product.create({
        data: {
          tenantId,
          name,
          description,
          type,
          price,
          compareAtPrice,
          currency: currency || 'NOK',
          sku: sku && sku.trim() !== '' ? sku : null, // Set to null if empty or undefined
          stock,
          trackInventory: trackInventory || false,
          sessionCount,
          validityDays,
          slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
          featured: featured || false,
          sortOrder: sortOrder || 0,
          metadata,
          status: 'DRAFT'
        },
        include: {
          images: true
        }
      });

      res.status(201).json({
        success: true,
        data: product,
        message: 'Produkt opprettet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Create product error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke opprette produkt' });
      }
    }
  }

  // Get all products (filtered)
  async getProducts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { type, status, featured, search } = req.query;

      const products = await prisma.product.findMany({
        where: {
          tenantId,
          ...(type && { type: type as any }),
          ...(status && { status: status as any }),
          ...(featured !== undefined && { featured: featured === 'true' }),
          ...(search && {
            OR: [
              { name: { contains: search as string, mode: 'insensitive' } },
              { description: { contains: search as string, mode: 'insensitive' } }
            ]
          })
        },
        include: {
          images: {
            orderBy: { sortOrder: 'asc' }
          }
        },
        orderBy: [
          { featured: 'desc' },
          { sortOrder: 'asc' },
          { createdAt: 'desc' }
        ]
      });

      res.json({ success: true, data: products });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente produkter' });
    }
  }

  // Get single product by ID or slug
  async getProduct(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;

      // Try to find by ID first, then by slug
      let product = await prisma.product.findFirst({
        where: {
          id,
          tenantId
        },
        include: {
          images: {
            orderBy: { sortOrder: 'asc' }
          }
        }
      });

      if (!product) {
        product = await prisma.product.findFirst({
          where: {
            slug: id,
            tenantId
          },
          include: {
            images: {
              orderBy: { sortOrder: 'asc' }
            }
          }
        });
      }

      if (!product) {
        throw new AppError('Produkt ikke funnet', 404);
      }

      res.json({ success: true, data: product });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Get product error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke hente produkt' });
      }
    }
  }

  // Update product (ADMIN only)
  async updateProduct(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const {
        name,
        description,
        type,
        status,
        price,
        compareAtPrice,
        currency,
        sku,
        stock,
        trackInventory,
        sessionCount,
        validityDays,
        slug,
        featured,
        sortOrder,
        metadata
      } = req.body;

      // Check if product exists
      const existingProduct = await prisma.product.findFirst({
        where: { id, tenantId }
      });

      if (!existingProduct) {
        throw new AppError('Produkt ikke funnet', 404);
      }

      // If slug is being changed, check if it's unique
      if (slug && slug !== existingProduct.slug) {
        const slugExists = await prisma.product.findUnique({
          where: {
            tenantId_slug: {
              tenantId,
              slug
            }
          }
        });

        if (slugExists) {
          throw new AppError('Slug eksisterer allerede', 400);
        }
      }

      // Update product
      const product = await prisma.product.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description && { description }),
          ...(type && { type }),
          ...(status && { status }),
          ...(price !== undefined && { price }),
          ...(compareAtPrice !== undefined && { compareAtPrice }),
          ...(currency && { currency }),
          ...(sku !== undefined && { sku: sku && sku.trim() !== '' ? sku : null }), // Set to null if empty
          ...(stock !== undefined && { stock }),
          ...(trackInventory !== undefined && { trackInventory }),
          ...(sessionCount !== undefined && { sessionCount }),
          ...(validityDays !== undefined && { validityDays }),
          ...(slug && { slug }),
          ...(featured !== undefined && { featured }),
          ...(sortOrder !== undefined && { sortOrder }),
          ...(metadata !== undefined && { metadata })
        },
        include: {
          images: {
            orderBy: { sortOrder: 'asc' }
          }
        }
      });

      res.json({
        success: true,
        data: product,
        message: 'Produkt oppdatert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Update product error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere produkt' });
      }
    }
  }

  // Delete product (ADMIN only) - Soft delete (archive)
  async deleteProduct(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;

      // Check if product exists
      const existingProduct = await prisma.product.findFirst({
        where: { id, tenantId }
      });

      if (!existingProduct) {
        throw new AppError('Produkt ikke funnet', 404);
      }

      // Soft delete - set status to ARCHIVED
      await prisma.product.update({
        where: { id },
        data: { status: 'ARCHIVED' }
      });

      res.json({
        success: true,
        message: 'Produkt arkivert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Delete product error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke slette produkt' });
      }
    }
  }

  // Add product image
  async addProductImage(req: AuthRequest, res: Response): Promise<void> {
    console.log('=== addProductImage ENTRY ===');
    console.log('req.params:', req.params);
    console.log('req.body:', req.body);
    console.log('req.tenantId:', req.tenantId);

    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const { url, altText, sortOrder, isPrimary } = req.body;

      console.log('addProductImage called:', { id, url, altText, sortOrder, isPrimary, body: req.body });

      // Validate URL
      if (!url || typeof url !== 'string' || url.trim() === '') {
        console.error('URL validation failed:', { url, type: typeof url, body: req.body });
        throw new AppError('Bilde URL er påkrevd', 400);
      }

      // Check if product exists
      const product = await prisma.product.findFirst({
        where: { id, tenantId }
      });

      if (!product) {
        throw new AppError('Produkt ikke funnet', 404);
      }

      // If this is set as primary, unset other primary images
      if (isPrimary) {
        await prisma.productImage.updateMany({
          where: { productId: id },
          data: { isPrimary: false }
        });
      }

      // Create image
      const image = await prisma.productImage.create({
        data: {
          productId: id,
          url,
          altText: altText || null,
          sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
          isPrimary: isPrimary === true || isPrimary === 'true'
        }
      });

      res.status(201).json({
        success: true,
        data: image,
        message: 'Bilde lagt til'
      });
    } catch (error) {
      console.error('=== addProductImage ERROR ===', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Add product image error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke legge til bilde' });
      }
    }
  }

  // Update product image
  async updateProductImage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { imageId } = req.params;
      const { url, altText, sortOrder, isPrimary } = req.body;

      const image = await prisma.productImage.findUnique({
        where: { id: imageId }
      });

      if (!image) {
        throw new AppError('Bilde ikke funnet', 404);
      }

      // If this is set as primary, unset other primary images
      if (isPrimary) {
        await prisma.productImage.updateMany({
          where: { productId: image.productId },
          data: { isPrimary: false }
        });
      }

      const updatedImage = await prisma.productImage.update({
        where: { id: imageId },
        data: {
          ...(url && { url }),
          ...(altText !== undefined && { altText }),
          ...(sortOrder !== undefined && { sortOrder }),
          ...(isPrimary !== undefined && { isPrimary })
        }
      });

      res.json({
        success: true,
        data: updatedImage,
        message: 'Bilde oppdatert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Update product image error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere bilde' });
      }
    }
  }

  // Delete product image
  async deleteProductImage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { imageId } = req.params;

      const image = await prisma.productImage.findUnique({
        where: { id: imageId }
      });

      if (!image) {
        throw new AppError('Bilde ikke funnet', 404);
      }

      await prisma.productImage.delete({
        where: { id: imageId }
      });

      res.json({
        success: true,
        message: 'Bilde slettet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Delete product image error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke slette bilde' });
      }
    }
  }

  // Publish product (ADMIN only)
  async publishProduct(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;

      const product = await prisma.product.findFirst({
        where: { id, tenantId }
      });

      if (!product) {
        throw new AppError('Produkt ikke funnet', 404);
      }

      const updatedProduct = await prisma.product.update({
        where: { id },
        data: { status: 'PUBLISHED' },
        include: {
          images: {
            orderBy: { sortOrder: 'asc' }
          }
        }
      });

      res.json({
        success: true,
        data: updatedProduct,
        message: 'Produkt publisert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Publish product error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke publisere produkt' });
      }
    }
  }

  // Unpublish product (ADMIN only)
  async unpublishProduct(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;

      const product = await prisma.product.findFirst({
        where: { id, tenantId }
      });

      if (!product) {
        throw new AppError('Produkt ikke funnet', 404);
      }

      const updatedProduct = await prisma.product.update({
        where: { id },
        data: { status: 'DRAFT' },
        include: {
          images: {
            orderBy: { sortOrder: 'asc' }
          }
        }
      });

      res.json({
        success: true,
        data: updatedProduct,
        message: 'Produkt avpublisert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Unpublish product error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke avpublisere produkt' });
      }
    }
  }
}
