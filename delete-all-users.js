const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  }),
});

const db = admin.firestore();
const auth = admin.auth();

async function deleteAllUsers() {
  console.log('🔍 Összes felhasználó betöltése...');
  
  // 1. Firestore users lekérése
  const usersSnapshot = await db.collection('users').get();
  console.log(`📋 Firestore users: ${usersSnapshot.size} db`);
  
  // 2. Firebase Auth users lekérése
  const authUsers = await auth.listUsers();
  console.log(`🔐 Auth users: ${authUsers.users.length} db`);
  
  console.log('\n⚠️  FIGYELEM: Az alábbi felhasználók törölve lesznek:');
  
  // Admin email
  const ADMIN_EMAIL = 'epresla@icloud.com';
  
  // Auth users listázása
  authUsers.users.forEach(user => {
    if (user.email !== ADMIN_EMAIL) {
      console.log(`  - Auth: ${user.email} (${user.uid})`);
    }
  });
  
  // Firestore users listázása
  usersSnapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.email !== ADMIN_EMAIL) {
      console.log(`  - Firestore: ${data.email || 'nincs email'} (${doc.id})`);
    }
  });
  
  console.log('\n⏳ Törlés 5 másodperc múlva... (CTRL+C a megszakításhoz)');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('\n🗑️  Törlés megkezdése...\n');
  
  let deletedAuth = 0;
  let deletedFirestore = 0;
  
  // Auth users törlése (kivéve admin)
  for (const user of authUsers.users) {
    if (user.email !== ADMIN_EMAIL) {
      try {
        await auth.deleteUser(user.uid);
        console.log(`✅ Auth törölve: ${user.email}`);
        deletedAuth++;
      } catch (error) {
        console.log(`❌ Auth törlés hiba: ${user.email} - ${error.message}`);
      }
    }
  }
  
  // Firestore users törlése (kivéve admin)
  for (const doc of usersSnapshot.docs) {
    const data = doc.data();
    if (data.email !== ADMIN_EMAIL && doc.id !== 'YOUR_ADMIN_UID') {
      try {
        await db.collection('users').doc(doc.id).delete();
        console.log(`✅ Firestore törölve: ${data.email || doc.id}`);
        deletedFirestore++;
      } catch (error) {
        console.log(`❌ Firestore törlés hiba: ${doc.id} - ${error.message}`);
      }
    }
  }
  
  console.log('\n✨ Törlés befejezve!');
  console.log(`📊 Auth törölve: ${deletedAuth} db`);
  console.log(`📊 Firestore törölve: ${deletedFirestore} db`);
  console.log(`\n🔐 Admin (${ADMIN_EMAIL}) megmaradt.`);
  
  process.exit(0);
}

deleteAllUsers().catch(error => {
  console.error('❌ Hiba:', error);
  process.exit(1);
});
