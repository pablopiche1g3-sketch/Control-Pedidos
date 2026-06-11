import express from 'express';
import path from 'path';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Resolve service account key path
const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');

let adminDb: Firestore | null = null;
let adminStatus = 'disconnected';

try {
  if (fs.existsSync(serviceAccountPath)) {
    console.log(`Initializing Firebase Admin with key: ${serviceAccountPath}`);
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({
      credential: cert(serviceAccount)
    });
    adminDb = getFirestore();
    adminStatus = 'connected';
  } else {
    console.warn('serviceAccountKey.json not found in project root. Attempting application default credentials...');
    initializeApp({
      credential: applicationDefault()
    });
    adminDb = getFirestore();
    adminStatus = 'connected_default';
  }
} catch (err) {
  console.error('Failed to initialize Firebase Admin SDK:', err);
  adminStatus = 'error';
}

app.use(express.json());

// Expose a database health-check API endpoint
app.get('/api/status', async (req, res) => {
  if (!adminDb) {
    res.status(500).json({ status: 'error', message: 'Firebase Admin not initialized', adminStatus });
    return;
  }

  try {
    // Simple fetch check
    const collectionsSnapshot = await adminDb.listCollections();
    res.json({
      status: 'healthy',
      adminStatus,
      collectionsCount: collectionsSnapshot.length,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      message: err.message || 'Firestore connection failed',
      adminStatus
    });
  }
});

// Serve static assets from Vite build output folder
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

// Fallback to index.html for Single Page Application (SPA) routing
app.get('*', (req, res) => {
  res.sendFile(path.resolve(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
  console.log(`Serving static files from: ${distPath}`);
  console.log(`Firebase Admin status: ${adminStatus}`);
});
