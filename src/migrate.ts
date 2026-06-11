import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import {
  DEFAULT_PRODUCTS,
  DEFAULT_BRANCHES,
  DEFAULT_SUPPLIERS,
  DEFAULT_REQUISITIONS,
  DEFAULT_EXTERNAL_ORDERS,
} from './data/defaults';

// Resolve service account key path
const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');

if (fs.existsSync(serviceAccountPath)) {
  console.log(`Found service account key at: ${serviceAccountPath}`);
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  initializeApp({
    credential: cert(serviceAccount)
  });
} else {
  console.warn('serviceAccountKey.json not found in project root. Attempting application default credentials...');
  initializeApp({
    credential: applicationDefault()
  });
}

const db = getFirestore();

async function migrate() {
  console.log('Starting migration to Firestore...');

  try {
    const batch = db.batch();

    // 1. Migrate Products
    console.log(`Staging ${DEFAULT_PRODUCTS.length} products...`);
    DEFAULT_PRODUCTS.forEach((product) => {
      const docRef = db.collection('products').doc(product.sku);
      batch.set(docRef, product);
    });

    // 2. Migrate Branches
    console.log(`Staging ${DEFAULT_BRANCHES.length} branches...`);
    DEFAULT_BRANCHES.forEach((branch) => {
      const docRef = db.collection('branches').doc(branch.id);
      batch.set(docRef, branch);
    });

    // 3. Migrate Suppliers
    console.log(`Staging ${DEFAULT_SUPPLIERS.length} suppliers...`);
    DEFAULT_SUPPLIERS.forEach((supplier) => {
      const docRef = db.collection('suppliers').doc(supplier.id);
      batch.set(docRef, supplier);
    });

    // 4. Migrate Requisitions
    console.log(`Staging ${DEFAULT_REQUISITIONS.length} requisitions...`);
    DEFAULT_REQUISITIONS.forEach((requisition) => {
      const docRef = db.collection('requisitions').doc(requisition.id);
      batch.set(docRef, requisition);
    });

    // 5. Migrate External Orders
    console.log(`Staging ${DEFAULT_EXTERNAL_ORDERS.length} external orders...`);
    DEFAULT_EXTERNAL_ORDERS.forEach((order) => {
      const docRef = db.collection('externalOrders').doc(order.id);
      batch.set(docRef, order);
    });

    console.log('Committing batch write to Firestore...');
    await batch.commit();
    console.log('Migration completed successfully! All default data seeded.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
