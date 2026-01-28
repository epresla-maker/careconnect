const admin = require('firebase-admin');
const fs = require('fs');

// Load .env.local manually
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?([^"]+)"?$/);
  if (match) env[match[1]] = match[2];
});

if (!admin.apps.length) {
  const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey
    })
  });
}

const email = 'epresla@icloud.com';

async function fixAuthEmailVerified() {
  try {
    // Get user by email from Firebase Auth
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log('📄 User UID:', userRecord.uid);
    console.log('📧 Firebase Auth emailVerified:', userRecord.emailVerified);
    
    if (!userRecord.emailVerified) {
      // Update Firebase Auth
      await admin.auth().updateUser(userRecord.uid, {
        emailVerified: true
      });
      console.log('✅ Firebase Auth emailVerified = true beállítva!');
    } else {
      console.log('✅ Firebase Auth emailVerified már true volt!');
    }
    
    // Update Firestore
    const db = admin.firestore();
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();
    
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      await usersRef.doc(userDoc.id).update({
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpires: null
      });
      console.log('✅ Firestore emailVerified = true beállítva!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Hiba:', error.message);
    process.exit(1);
  }
}

fixAuthEmailVerified();
