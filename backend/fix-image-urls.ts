import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixImageUrls() {
  console.log('Starting image URL migration...');

  try {
    // Fix product images table
    const productImages = await prisma.productImage.findMany({
      where: {
        url: {
          contains: 'localhost'
        }
      }
    });

    console.log(`Found ${productImages.length} product images with localhost URLs`);

    for (const image of productImages) {
      const newUrl = image.url.replace('localhost:3000', '10.0.0.57:3000')
                              .replace('127.0.0.1:3000', '10.0.0.57:3000');

      await prisma.productImage.update({
        where: { id: image.id },
        data: { url: newUrl }
      });

      console.log(`✓ Fixed product image ID: ${image.id}`);
      console.log(`  Old URL: ${image.url}`);
      console.log(`  New URL: ${newUrl}`);
    }

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixImageUrls();
