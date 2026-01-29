require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    })
  });
}

const db = admin.firestore();

async function check() {
  console.log('=== USERS WITH epresla@icloud.com ===\n');
  
  const usersSnap = await db.collection('users').where('email', '==', 'epresla@icloud.com').get();
  
  usersSnap.docs.forEach(d => {
    const data = d.data();
    console.log('userId:', d.id);
    console.log('email:', data.email);
    console.log('name:', data.name || data.displayName);
    console.log('pharmagisterRole:', data.pharmagisterRole);
    console.log('createdAt:', data.createdAt?.toDate());
    console.log('---');
  });
  
  console.log('\nTotal users with this email:', usersSnap.size);
}

check().then(() => process.exit(0));
