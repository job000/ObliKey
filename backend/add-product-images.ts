import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Map of product slugs to image URLs (using Unsplash placeholder images)
const productImages: Record<string, string> = {
  // Physical Products - Equipment
  'kettlebell-16kg': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
  'yogamatte-premium': 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&q=80',
  'treningselastikk-sett': 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=800&q=80',
  'skippetau-pro': 'https://images.unsplash.com/photo-1520222984843-df35ebc0f24d?w=800&q=80',
  'gymhansker-laer-premium': 'https://images.unsplash.com/photo-1584466977773-e625c37cdd50?w=800&q=80',
  'foam-roller': 'https://images.unsplash.com/photo-1518644961665-ed172691aaa1?w=800&q=80',

  // Supplements
  'proteinpulver-vanilje-1kg': 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=800&q=80',
  'proteinpulver-sjokolade-1kg': 'https://images.unsplash.com/photo-1626200419199-391ae4be7a41?w=800&q=80',
  'creatine-monohydrate-500g': 'https://images.unsplash.com/photo-1606787619249-5d783e6d74c5?w=800&q=80',
  'bcaa-energi': 'https://images.unsplash.com/photo-1599932550279-23b9c0d00ded?w=800&q=80',

  // Memberships
  'medlemskap-maaned': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
  'medlemskap-3-maaneder': 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80',
  'medlemskap-aarskort': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
  'dagskort': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',

  // PT Services
  'pt-pakke-intro': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
  'pt-pakke-5-timer': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
  'pt-pakke-10-timer': 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80',

  // Programs/Plans
  'kostholdsplan-vektreduksjon': 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80',
  'hjemmetreningsprogram': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
  '12-ukers-styrkeprogram': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80'
};

async function addProductImages() {
  console.log('Starting to add product images...\n');

  try {
    // Get Premium Gym tenant
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain: 'premium-gym' }
    });

    if (!tenant) {
      console.error('❌ Premium Gym tenant not found');
      return;
    }

    // Get all products for this tenant
    const products = await prisma.product.findMany({
      where: { tenantId: tenant.id },
      include: { images: true }
    });

    console.log(`Found ${products.length} products\n`);

    let addedCount = 0;
    let skippedCount = 0;

    for (const product of products) {
      // Skip if product already has images
      if (product.images && product.images.length > 0) {
        console.log(`⏭️  Skipping ${product.name} - already has ${product.images.length} image(s)`);
        skippedCount++;
        continue;
      }

      // Get image URL for this product
      const imageUrl = productImages[product.slug];

      if (!imageUrl) {
        console.log(`⚠️  No image URL found for product: ${product.name} (${product.slug})`);
        continue;
      }

      // Create product image
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: imageUrl,
          altText: product.name,
          isPrimary: true,
          sortOrder: 0
        }
      });

      console.log(`✅ Added image for: ${product.name}`);
      addedCount++;
    }

    console.log(`\n✅ Image addition complete!`);
    console.log(`   Added: ${addedCount}`);
    console.log(`   Skipped: ${skippedCount}`);

  } catch (error) {
    console.error('❌ Error adding product images:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addProductImages();
