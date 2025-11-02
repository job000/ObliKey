import { PrismaClient, Feature, FeaturePack, FeatureCategory, SubscriptionInterval } from '@prisma/client';

const prisma = new PrismaClient();

export interface FeatureCreateData {
  key: string;
  name: string;
  description?: string;
  category: FeatureCategory;
  isCore?: boolean;
  sortOrder?: number;
}

export interface FeatureUpdateData {
  name?: string;
  description?: string;
  category?: FeatureCategory;
  isCore?: boolean;
  sortOrder?: number;
  active?: boolean;
}

export interface FeaturePackCreateData {
  name: string;
  slug: string;
  description?: string;
  price: number;
  currency?: string;
  interval: SubscriptionInterval;
  trialDays?: number;
  isPopular?: boolean;
  sortOrder?: number;
  featureIds: string[]; // Array of feature IDs to include in this pack
  metadata?: any;
}

export interface FeaturePackUpdateData {
  name?: string;
  slug?: string;
  description?: string;
  price?: number;
  currency?: string;
  interval?: SubscriptionInterval;
  trialDays?: number;
  isPopular?: boolean;
  sortOrder?: number;
  featureIds?: string[]; // Update the features in this pack
  active?: boolean;
  metadata?: any;
}

export class FeatureManagementService {
  /**
   * Get all features
   */
  async getAllFeatures(includeInactive = false) {
    const where: any = {};
    if (!includeInactive) {
      where.active = true;
    }

    return await prisma.feature.findMany({
      where,
      include: {
        _count: {
          select: {
            tenantFeatures: { where: { enabled: true } },
            featurePacks: true,
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get features by category
   */
  async getFeaturesByCategory(category: FeatureCategory) {
    return await prisma.feature.findMany({
      where: {
        category,
        active: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get a single feature by ID
   */
  async getFeatureById(featureId: string) {
    return await prisma.feature.findUnique({
      where: { id: featureId },
      include: {
        featurePacks: {
          include: {
            pack: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        tenantFeatures: {
          where: { enabled: true },
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                subdomain: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Create a new feature
   */
  async createFeature(data: FeatureCreateData): Promise<Feature> {
    // Check if key already exists
    const existing = await prisma.feature.findUnique({
      where: { key: data.key },
    });

    if (existing) {
      throw new Error(`Feature with key '${data.key}' already exists`);
    }

    return await prisma.feature.create({
      data: {
        key: data.key,
        name: data.name,
        description: data.description,
        category: data.category,
        isCore: data.isCore || false,
        sortOrder: data.sortOrder || 0,
        active: true,
      },
    });
  }

  /**
   * Update a feature
   */
  async updateFeature(featureId: string, data: FeatureUpdateData): Promise<Feature> {
    return await prisma.feature.update({
      where: { id: featureId },
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        isCore: data.isCore,
        sortOrder: data.sortOrder,
        active: data.active,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete a feature (soft delete by marking as inactive)
   */
  async deleteFeature(featureId: string): Promise<void> {
    await prisma.feature.update({
      where: { id: featureId },
      data: { active: false },
    });
  }

  /**
   * Get all feature packs
   */
  async getAllFeaturePacks(includeInactive = false) {
    const where: any = {};
    if (!includeInactive) {
      where.active = true;
    }

    return await prisma.featurePack.findMany({
      where,
      include: {
        features: {
          include: {
            feature: {
              select: {
                id: true,
                key: true,
                name: true,
                category: true,
                isCore: true,
              },
            },
          },
        },
        _count: {
          select: {
            subscriptions: { where: { status: 'ACTIVE' } },
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get a single feature pack by ID
   */
  async getFeaturePackById(packId: string) {
    return await prisma.featurePack.findUnique({
      where: { id: packId },
      include: {
        features: {
          include: {
            feature: true,
          },
        },
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                subdomain: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get feature pack by slug
   */
  async getFeaturePackBySlug(slug: string) {
    return await prisma.featurePack.findUnique({
      where: { slug },
      include: {
        features: {
          include: {
            feature: true,
          },
        },
      },
    });
  }

  /**
   * Create a new feature pack
   */
  async createFeaturePack(data: FeaturePackCreateData): Promise<FeaturePack> {
    // Check if slug already exists
    const existing = await prisma.featurePack.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      throw new Error(`Feature pack with slug '${data.slug}' already exists`);
    }

    // Verify all feature IDs exist
    const features = await prisma.feature.findMany({
      where: { id: { in: data.featureIds } },
    });

    if (features.length !== data.featureIds.length) {
      throw new Error('Some feature IDs are invalid');
    }

    return await prisma.featurePack.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        price: data.price,
        currency: data.currency || 'NOK',
        interval: data.interval,
        trialDays: data.trialDays || 0,
        isPopular: data.isPopular || false,
        sortOrder: data.sortOrder || 0,
        metadata: data.metadata,
        active: true,
        features: {
          create: data.featureIds.map(featureId => ({
            featureId,
          })),
        },
      },
      include: {
        features: {
          include: {
            feature: true,
          },
        },
      },
    });
  }

  /**
   * Update a feature pack
   */
  async updateFeaturePack(packId: string, data: FeaturePackUpdateData): Promise<FeaturePack> {
    // If updating featureIds, verify they exist and update relations
    if (data.featureIds) {
      const features = await prisma.feature.findMany({
        where: { id: { in: data.featureIds } },
      });

      if (features.length !== data.featureIds.length) {
        throw new Error('Some feature IDs are invalid');
      }

      // Delete existing feature associations and create new ones
      await prisma.featurePackItem.deleteMany({
        where: { packId },
      });

      await prisma.featurePackItem.createMany({
        data: data.featureIds.map(featureId => ({
          packId,
          featureId,
        })),
      });
    }

    return await prisma.featurePack.update({
      where: { id: packId },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        price: data.price,
        currency: data.currency,
        interval: data.interval,
        trialDays: data.trialDays,
        isPopular: data.isPopular,
        sortOrder: data.sortOrder,
        active: data.active,
        metadata: data.metadata,
        updatedAt: new Date(),
      },
      include: {
        features: {
          include: {
            feature: true,
          },
        },
      },
    });
  }

  /**
   * Delete a feature pack (soft delete by marking as inactive)
   */
  async deleteFeaturePack(packId: string): Promise<void> {
    await prisma.featurePack.update({
      where: { id: packId },
      data: { active: false },
    });
  }

  /**
   * Enable a feature for a tenant
   */
  async enableFeatureForTenant(tenantId: string, featureId: string) {
    // Get feature details to check if it's PT
    const feature = await prisma.feature.findUnique({
      where: { id: featureId }
    });

    // Check if already enabled
    const existing = await prisma.tenantFeature.findUnique({
      where: {
        tenantId_featureId: {
          tenantId,
          featureId,
        },
      },
    });

    let result;
    if (existing) {
      if (existing.enabled) {
        result = existing; // Already enabled
      } else {
        // Re-enable if it was disabled
        result = await prisma.tenantFeature.update({
          where: {
            tenantId_featureId: {
              tenantId,
              featureId,
            },
          },
          data: {
            enabled: true,
            enabledAt: new Date(),
            disabledAt: null,
          },
        });
      }
    } else {
      // Create new tenant feature
      result = await prisma.tenantFeature.create({
        data: {
          tenantId,
          featureId,
          enabled: true,
          enabledAt: new Date(),
        },
      });
    }

    // Sync with tenant_settings if it's PT feature
    if (feature?.key === 'pt') {
      await prisma.tenantSettings.upsert({
        where: { tenantId },
        create: {
          tenantId,
          ptEnabled: true
        },
        update: {
          ptEnabled: true
        }
      });
      console.log(`✅ Synced tenant_settings for tenant ${tenantId}: ptEnabled=true`);
    }

    return result;
  }

  /**
   * Disable a feature for a tenant
   */
  async disableFeatureForTenant(tenantId: string, featureId: string) {
    // Get feature details to check if it's PT
    const feature = await prisma.feature.findUnique({
      where: { id: featureId }
    });

    const result = await prisma.tenantFeature.update({
      where: {
        tenantId_featureId: {
          tenantId,
          featureId,
        },
      },
      data: {
        enabled: false,
        disabledAt: new Date(),
      },
    });

    // Sync with tenant_settings if it's PT feature
    if (feature?.key === 'pt') {
      await prisma.tenantSettings.update({
        where: { tenantId },
        data: {
          ptEnabled: false
        }
      });
      console.log(`✅ Synced tenant_settings for tenant ${tenantId}: ptEnabled=false`);
    }

    return result;
  }

  /**
   * Set multiple features for a tenant (replace all)
   */
  async setTenantFeatures(tenantId: string, featureIds: string[]) {
    // Verify all feature IDs exist
    const features = await prisma.feature.findMany({
      where: { id: { in: featureIds } },
    });

    if (features.length !== featureIds.length) {
      throw new Error('Some feature IDs are invalid');
    }

    // Get existing tenant features
    const existing = await prisma.tenantFeature.findMany({
      where: { tenantId },
    });

    const existingFeatureIds = existing.map(tf => tf.featureId);
    const toAdd = featureIds.filter(id => !existingFeatureIds.includes(id));
    const toRemove = existingFeatureIds.filter(id => !featureIds.includes(id));
    const toEnable = existingFeatureIds.filter(
      id => featureIds.includes(id) && !existing.find(tf => tf.featureId === id)?.enabled
    );

    // Add new features
    if (toAdd.length > 0) {
      await prisma.tenantFeature.createMany({
        data: toAdd.map(featureId => ({
          tenantId,
          featureId,
          enabled: true,
          enabledAt: new Date(),
        })),
      });
    }

    // Disable removed features
    if (toRemove.length > 0) {
      await prisma.tenantFeature.updateMany({
        where: {
          tenantId,
          featureId: { in: toRemove },
        },
        data: {
          enabled: false,
          disabledAt: new Date(),
        },
      });
    }

    // Re-enable features
    if (toEnable.length > 0) {
      await prisma.tenantFeature.updateMany({
        where: {
          tenantId,
          featureId: { in: toEnable },
        },
        data: {
          enabled: true,
          enabledAt: new Date(),
          disabledAt: null,
        },
      });
    }

    return await this.getTenantFeatures(tenantId);
  }

  /**
   * Get all features for a tenant (including disabled ones)
   */
  async getTenantFeatures(tenantId: string) {
    return await prisma.tenantFeature.findMany({
      where: {
        tenantId,
      },
      include: {
        feature: true,
      },
      orderBy: {
        feature: {
          sortOrder: 'asc',
        },
      },
    });
  }

  /**
   * Check if a tenant has a specific feature enabled
   */
  async tenantHasFeature(tenantId: string, featureKey: string): Promise<boolean> {
    const tenantFeature = await prisma.tenantFeature.findFirst({
      where: {
        tenantId,
        enabled: true,
        feature: {
          key: featureKey,
          active: true,
        },
      },
    });

    return !!tenantFeature;
  }

  /**
   * Apply a feature pack to a tenant
   */
  async applyFeaturePackToTenant(tenantId: string, packId: string) {
    const pack = await prisma.featurePack.findUnique({
      where: { id: packId },
      include: {
        features: {
          include: {
            feature: true,
          },
        },
      },
    });

    if (!pack) {
      throw new Error('Feature pack not found');
    }

    const featureIds = pack.features
      .filter(f => f.feature.active)
      .map(f => f.featureId);

    return await this.setTenantFeatures(tenantId, featureIds);
  }

  /**
   * Get feature usage statistics
   */
  async getFeatureStats() {
    const features = await prisma.feature.findMany({
      where: { active: true },
      include: {
        _count: {
          select: {
            tenantFeatures: { where: { enabled: true } },
            featurePacks: { where: { pack: { active: true } } },
          },
        },
      },
      orderBy: {
        tenantFeatures: {
          _count: 'desc',
        },
      },
    });

    return features.map(f => ({
      id: f.id,
      key: f.key,
      name: f.name,
      category: f.category,
      isCore: f.isCore,
      tenantsUsing: f._count.tenantFeatures,
      includedInPacks: f._count.featurePacks,
    }));
  }
}

export default new FeatureManagementService();
