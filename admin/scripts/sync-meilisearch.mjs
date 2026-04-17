import admin from "firebase-admin";
import { MeiliSearch } from "meilisearch";
import serviceAccount from "./pet-universe-service-credential.json" with { type: "json" };

// --- Configuration ---
const BUSINESS_ID = 'UxV3kguHQdGr3nhI7pMx';
const MEILI_HOST = process.env.MEILI_HOST || 'http://localhost:7700';
const MEILI_API_KEY = process.env.MEILI_API_KEY || '';
const INDEX_NAME = 'petu_products';

// --- Init Firebase ---
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

// --- Init Meilisearch ---
const meili = new MeiliSearch({
  host: MEILI_HOST,
  apiKey: MEILI_API_KEY,
});

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 \-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

async function syncProducts() {
  console.log('--- Meilisearch Sync ---');
  console.log(`Host: ${MEILI_HOST}`);
  console.log(`Business: ${BUSINESS_ID}\n`);

  // 0. Verify Meilisearch connection and API key
  console.log('Verifying Meilisearch connection...');
  try {
    const health = await meili.health();
    if (health.status !== 'available') throw new Error('Unhealthy');
  } catch (e) {
    console.error(`  Cannot reach Meilisearch at ${MEILI_HOST}. Is it running?`);
    process.exit(1);
  }

  try {
    const stats = await meili.getStats();
    console.log(`  Connected. ${Object.keys(stats.indexes).length} existing index(es)\n`);
  } catch (e) {
    console.error('  API key rejected or lacks admin permissions. Use the Admin API Key (not search key).');
    process.exit(1);
  }

  // 1. Fetch categories
  console.log('Fetching categories...');
  const catSnapshot = await db.collection('productCategory')
    .where('businessId', '==', BUSINESS_ID)
    .where('isActive', '==', true)
    .get();

  const categories = {};
  catSnapshot.docs.forEach(doc => {
    categories[doc.id] = doc.data().name;
  });
  console.log(`  ${Object.keys(categories).length} categories loaded`);

  // 2. Fetch products
  console.log('Fetching products...');
  const prodSnapshot = await db.collection('product')
    .where('businessId', '==', BUSINESS_ID)
    .where('isActive', '==', true)
    .get();
  console.log(`  ${prodSnapshot.size} active products`);

  // 3. Fetch inventory (for stock status)
  console.log('Fetching inventory...');
  const invSnapshot = await db.collection('inventory')
    .where('businessId', '==', BUSINESS_ID)
    .where('isActive', '==', true)
    .get();

  const inventory = {};
  invSnapshot.docs.forEach(doc => {
    const data = doc.data();
    inventory[data.productId] = {
      unitsInStock: data.unitsInStock || 0,
      totalWeight: data.totalWeight || 0,
      lastPurchaseCost: data.lastPurchaseCost || 0,
    };
  });
  console.log(`  ${Object.keys(inventory).length} inventory records`);

  // 4. Transform to Meilisearch documents
  // Skip products without an image — public storefront should not list them.
  const productsWithImage = prodSnapshot.docs.filter(doc => doc.data().hasImage === true);
  const skipped = prodSnapshot.size - productsWithImage.length;
  if (skipped > 0) console.log(`  (skipping ${skipped} products without image)`);

  const slugCounts = {};
  const documents = productsWithImage.map(doc => {
    const data = doc.data();
    const inv = inventory[doc.id] || { unitsInStock: 0, totalWeight: 0, lastPurchaseCost: 0 };

    // Slug: use existing or generate
    let slug = data.slug;
    if (!slug) {
      const weight = data.unitWeight ? `${data.unitWeight}kg` : '';
      slug = slugify([data.brand, data.name, weight].filter(Boolean).join(' '));
    }

    // Handle duplicate slugs
    if (slugCounts[slug]) {
      slugCounts[slug]++;
      slug = `${slug}-${slugCounts[slug]}`;
    } else {
      slugCounts[slug] = 1;
    }

    const inStock = data.trackingType === 'weight' || data.trackingType === 'dual'
      ? inv.totalWeight > 0 || inv.unitsInStock > 0
      : inv.unitsInStock > 0;

    return {
      id: doc.id,
      name: data.name || '',
      slug,
      description: data.description || '',
      category: data.category || '',
      categoryName: categories[data.category] || '',
      subcategory: data.subcategory || '',
      brand: data.brand || '',
      productCode: data.productCode || '',
      trackingType: data.trackingType || 'unit',
      unitType: data.unitType || 'unit',
      unitWeight: data.unitWeight || 0,
      allowsLooseSales: data.allowsLooseSales || false,
      // Bag / unit prices.
      priceRegular: data.prices?.regular || 0,
      priceCash: data.prices?.cash || 0,
      // Per-kg prices (duals).
      // `priceKgCash` is NOT stored on the product — it's derived from the bag
      // cash price divided by unit weight, matching the admin convention
      // (see admin/stores/product.ts → `cashPerKg`).
      priceKgRegular: data.prices?.kg?.regular || 0,
      priceKgCash: data.unitWeight > 0 ? (data.prices?.cash || 0) / data.unitWeight : 0,
      priceKg3Plus: data.prices?.kg?.threePlusDiscount || 0,
      threePlusMarkupPercentage: data.threePlusMarkupPercentage || 0,
      // Inventory snapshot — exposed for stock-level hints on the storefront
      // (e.g. "Últimas 2 unidades", "23kg sueltos disponibles").
      unitsInStock: inv.unitsInStock || 0,
      totalWeight: inv.totalWeight || 0,
      hasImage: data.hasImage || false,
      imageUpdatedAt: data.imageUpdatedAt || 0,
      inStock,
      updatedAt: data.updatedAt ? new Date(data.updatedAt).getTime() : Date.now(),
    };
  });

  console.log(`\nPrepared ${documents.length} documents for indexing`);

  // 5. Configure index settings
  const index = meili.index(INDEX_NAME);

  console.log('Updating index settings...');
  await index.updateSettings({
    searchableAttributes: ['name', 'brand', 'description', 'categoryName', 'productCode'],
    filterableAttributes: ['category', 'categoryName', 'inStock', 'brand', 'subcategory', 'slug', 'trackingType'],
    sortableAttributes: ['name', 'priceRegular', 'updatedAt'],
    pagination: { maxTotalHits: 1000 },
  });

  // 6. Push documents (full replace — clear orphans first)
  console.log('Clearing existing documents...');
  const clearTask = await index.deleteAllDocuments();
  await meili.tasks.waitForTask(clearTask.taskUid, { timeOutMs: 30000 });

  console.log('Indexing documents...');
  const task = await index.addDocuments(documents, { primaryKey: 'id' });
  console.log(`  Enqueued task ${task.taskUid}`);

  // Wait for indexing to complete
  const result = await meili.tasks.waitForTask(task.taskUid, { timeOutMs: 30000 });
  console.log(`  Status: ${result.status}`);

  if (result.status === 'failed') {
    console.error('  Error:', result.error);
    process.exit(1);
  }

  // 7. Also sync categories as a separate index
  const catIndex = meili.index('petu_categories');
  const catDocuments = catSnapshot.docs.map(doc => ({
    id: doc.id,
    name: doc.data().name,
    slug: slugify(doc.data().name),
    description: doc.data().description || '',
  }));

  console.log(`\nSyncing ${catDocuments.length} categories...`);
  const catTask = await catIndex.addDocuments(catDocuments, { primaryKey: 'id' });
  await meili.tasks.waitForTask(catTask.taskUid, { timeOutMs: 10000 });

  console.log('\n--- Sync complete! ---');
}

syncProducts().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
