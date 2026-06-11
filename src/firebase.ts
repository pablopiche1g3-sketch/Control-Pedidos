import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, writeBatch, getDocs, getDoc, setDoc } from 'firebase/firestore';
import {
  DEFAULT_PRODUCTS,
  DEFAULT_BRANCHES,
  DEFAULT_SUPPLIERS,
  DEFAULT_REQUISITIONS,
  DEFAULT_EXTERNAL_ORDERS,
} from './data/defaults';

const firebaseConfig = {
  apiKey: "AIzaSyDqTk1xbvINihF2byfYWzQgKYV96xjL20I",
  authDomain: "centro-pedidos.firebaseapp.com",
  projectId: "centro-pedidos",
  storageBucket: "centro-pedidos.firebasestorage.app",
  messagingSenderId: "529963259837",
  appId: "1:529963259837:web:42940d1bdd722ea0e2a4d4",
  measurementId: "G-3R9J47PK10"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Seeding helper to initialize data if Firestore collections are empty
export async function seedDatabaseIfEmpty() {
  const configDocRef = doc(db, 'systemSettings', 'config');
  try {
    const configSnap = await getDoc(configDocRef);
    if (!configSnap.exists()) {
      console.log('Database empty or not initialized. Seeding defaults...');
      const batch = writeBatch(db);

      // Save initialized flag
      batch.set(configDocRef, { initialized: true, seededAt: new Date().toISOString() });

      DEFAULT_PRODUCTS.forEach((p) => {
        batch.set(doc(db, 'products', p.sku), p);
      });
      DEFAULT_BRANCHES.forEach((b) => {
        batch.set(doc(db, 'branches', b.id), b);
      });
      DEFAULT_SUPPLIERS.forEach((s) => {
        batch.set(doc(db, 'suppliers', s.id), s);
      });
      DEFAULT_REQUISITIONS.forEach((r) => {
        batch.set(doc(db, 'requisitions', r.id), r);
      });
      DEFAULT_EXTERNAL_ORDERS.forEach((o) => {
        batch.set(doc(db, 'externalOrders', o.id), o);
      });

      await batch.commit();
      console.log('Database seeded successfully!');
    } else {
      console.log('Database already initialized. Skipping seeding.');
    }
  } catch (err) {
    console.error('Error in seedDatabaseIfEmpty:', err);
    // Legacy fallback check in case of permission issues or other errors with systemSettings
    const querySnapshot = await getDocs(collection(db, 'products'));
    if (querySnapshot.empty) {
      console.log('Fallback legacy check: Database empty. Seeding defaults...');
      const batch = writeBatch(db);
      DEFAULT_PRODUCTS.forEach((p) => {
        batch.set(doc(db, 'products', p.sku), p);
      });
      DEFAULT_BRANCHES.forEach((b) => {
        batch.set(doc(db, 'branches', b.id), b);
      });
      DEFAULT_SUPPLIERS.forEach((s) => {
        batch.set(doc(db, 'suppliers', s.id), s);
      });
      DEFAULT_REQUISITIONS.forEach((r) => {
        batch.set(doc(db, 'requisitions', r.id), r);
      });
      DEFAULT_EXTERNAL_ORDERS.forEach((o) => {
        batch.set(doc(db, 'externalOrders', o.id), o);
      });
      await batch.commit();
    }
  }
}


// Generic sync utility to update Firestore document additions, modifications, and deletions in batches of 500
export async function commitChanges<T extends Record<string, any>>(
  collectionName: string,
  newItems: T[],
  oldItems: T[],
  idKey: keyof T
) {
  const toUpsert: T[] = [];
  const toDelete: T[] = [];

  for (const item of newItems) {
    const id = item[idKey];
    if (id === undefined || id === null) continue;
    const existing = oldItems.find((o) => o[idKey] === id);
    if (!existing || JSON.stringify(existing) !== JSON.stringify(item)) {
      toUpsert.push(item);
    }
  }

  for (const existing of oldItems) {
    const id = existing[idKey];
    if (id === undefined || id === null) continue;
    if (!newItems.some((n) => n[idKey] === id)) {
      toDelete.push(existing);
    }
  }

  const totalOps = toUpsert.length + toDelete.length;
  if (totalOps === 0) return;

  const BATCH_LIMIT = 500;
  let batch = writeBatch(db);
  let opCount = 0;

  const commitBatchIfNeeded = async () => {
    if (opCount >= BATCH_LIMIT) {
      await batch.commit();
      batch = writeBatch(db);
      opCount = 0;
    }
  };

  for (const item of toUpsert) {
    const id = String(item[idKey]);
    const docRef = doc(db, collectionName, id);
    batch.set(docRef, item);
    opCount++;
    await commitBatchIfNeeded();
  }

  for (const item of toDelete) {
    const id = String(item[idKey]);
    const docRef = doc(db, collectionName, id);
    batch.delete(docRef);
    opCount++;
    await commitBatchIfNeeded();
  }

  if (opCount > 0) {
    await batch.commit();
  }
}
