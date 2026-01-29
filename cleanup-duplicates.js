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

async function cleanup() {
  await db.collection('users').doc('IHgxSeGJZjQRcuDaxF3sIRKkGgk2').delete();
  console.log('✅ Deleted IHgxSeGJZjQRcuDaxF3sIRKkGgk2');
  
  await db.collection('users').doc('Z8uUDktrQAfeQHT51REJaRP2z9n2').delete();
  console.log('✅ Deleted Z8uUDktrQAfeQHT51REJaRP2z9n2');
  
  console.log('\n✅ Cleanup complete!');
}

cleanup().then(() => process.exit(0));
