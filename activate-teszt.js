require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();
const auth = admin.auth();

(async () => {
  try {
    // Find user by email
    const userRecord = await auth.getUserByEmail('teszt@teszt.com');
    console.log('User found:', userRecord.uid);
    
    // Update email verification in Auth
    await auth.updateUser(userRecord.uid, {
      emailVerified: true
    });
    console.log('✅ Email verified in Firebase Auth');
    
    // Update in Firestore
    await db.collection('users').doc(userRecord.uid).update({
      emailVerified: true,
      verificationToken: admin.firestore.FieldValue.delete(),
      verificationTokenExpires: admin.firestore.FieldValue.delete()
    });
    console.log('✅ Email verified in Firestore');
    
    console.log('✅ teszt@teszt.com successfully activated!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
