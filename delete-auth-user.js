// Firebase Auth user törlése
// Használat: node delete-auth-user.js valifriend3@freemail.hu

const admin = require('firebase-admin');

// Service account inicializálás
const serviceAccount = require(process.env.HOME + '/Downloads/pharmacare-dfa3c-firebase-adminsdk-fbsvc-569047f165.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const email = process.argv[2];

if (!email) {
  console.log('❌ Használat: node delete-auth-user.js <email@example.com>');
  process.exit(1);
}

async function deleteUserByEmail(email) {
  try {
    console.log(`🔍 Keresem: ${email}`);
    
    // Email alapján user keresése
    const user = await admin.auth().getUserByEmail(email);
    console.log(`✅ Megtalálva: ${user.uid}`);
    
    // Törlés
    await admin.auth().deleteUser(user.uid);
    console.log(`✅ Felhasználó sikeresen törölve Firebase Auth-ból!`);
    console.log(`   Most már újra lehet regisztrálni ezzel az email címmel.`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Hiba:', error.message);
    process.exit(1);
  }
}

deleteUserByEmail(email);
