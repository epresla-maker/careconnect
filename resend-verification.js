const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const email = 'valifriend3@freemail.hu';

async function resendVerification() {
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log(`Felhasználó megtalálva: ${userRecord.uid}`);
    console.log(`Email verified: ${userRecord.emailVerified}`);
    
    // Generálunk egy új email verification linket
    const link = await admin.auth().generateEmailVerificationLink(email);
    console.log('\n✅ Aktiváló link generálva:');
    console.log(link);
    console.log('\nKattints erre a linkre vagy másold be a böngészőbe!');
    
  } catch (error) {
    console.error('Hiba:', error);
  }
  
  process.exit(0);
}

resendVerification();
