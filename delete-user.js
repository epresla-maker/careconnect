const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const email = 'valifriend3@freemail.hu';

async function deleteUser() {
  try {
    // Megkeressük a felhasználót email alapján
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log(`Felhasználó megtalálva: ${userRecord.uid}`);
    
    // Töröljük az Auth-ból
    await admin.auth().deleteUser(userRecord.uid);
    console.log(`✅ Auth törlés sikeres: ${email}`);
    
    // Töröljük a Firestore-ból
    await admin.firestore().collection('users').doc(userRecord.uid).delete();
    console.log(`✅ Firestore törlés sikeres: ${email}`);
    
    console.log('\n🎉 Felhasználó teljesen törölve! Most már újra regisztrálhatsz ezzel az email címmel.');
    
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.log(`❌ Nem található felhasználó ezzel az email címmel: ${email}`);
    } else {
      console.error('Hiba:', error);
    }
  }
  
  process.exit(0);
}

deleteUser();
