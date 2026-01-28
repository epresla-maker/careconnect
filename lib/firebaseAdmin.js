// lib/firebaseAdmin.js
import admin from 'firebase-admin';

let firebaseAdmin;

export function getFirebaseAdmin() {
  if (firebaseAdmin) {
    return firebaseAdmin;
  }

  if (!admin.apps.length) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      
      if (!privateKey || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
        throw new Error('Missing required Firebase Admin environment variables');
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });

      console.log('✅ Firebase Admin initialized successfully');
    } catch (error) {
      console.error('❌ Firebase Admin initialization failed:', error.message);
      throw error;
    }
  }

  firebaseAdmin = admin;
  return firebaseAdmin;
}

export default getFirebaseAdmin;
