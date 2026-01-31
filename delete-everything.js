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

// Törlendő kollekcók
const COLLECTIONS_TO_DELETE = [
  'users',
  'pharmaDemands',
  'serviceFeedPosts',
  'chats',
  'notifications',
  'posts',
  'comments',
  'likes',
  'follows',
  'pushSubscriptions',
  'verificationTokens',
  'messages'
];

async function deleteCollection(collectionName) {
  console.log(`\n📂 ${collectionName} kollekció törlése...`);
  
  try {
    const snapshot = await db.collection(collectionName).get();
    
    if (snapshot.empty) {
      console.log(`  ✅ ${collectionName}: üres, nincs mit törölni`);
      return 0;
    }
    
    console.log(`  📊 ${snapshot.size} dokumentum törlése...`);
    
    // Batch törlés (max 500 per batch)
    const batches = [];
    let batch = db.batch();
    let operationCount = 0;
    
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
      operationCount++;
      
      if (operationCount === 500) {
        batches.push(batch.commit());
        batch = db.batch();
        operationCount = 0;
      }
    }
    
    if (operationCount > 0) {
      batches.push(batch.commit());
    }
    
    await Promise.all(batches);
    console.log(`  ✅ ${collectionName}: ${snapshot.size} dokumentum törölve`);
    return snapshot.size;
    
  } catch (error) {
    console.log(`  ❌ ${collectionName} hiba: ${error.message}`);
    return 0;
  }
}

async function deleteAllAuthUsers() {
  console.log('\n🔐 Firebase Auth felhasználók törlése (MINDEGYIK, admin is!)...');
  
  try {
    const listUsersResult = await auth.listUsers();
    console.log(`  📊 ${listUsersResult.users.length} auth felhasználó található`);
    
    let deleted = 0;
    for (const user of listUsersResult.users) {
      try {
        await auth.deleteUser(user.uid);
        console.log(`  ✅ Törölve: ${user.email || user.uid}`);
        deleted++;
      } catch (error) {
        console.log(`  ❌ Hiba: ${user.email} - ${error.message}`);
      }
    }
    
    return deleted;
  } catch (error) {
    console.log(`  ❌ Auth törlés hiba: ${error.message}`);
    return 0;
  }
}

async function deleteSubcollections() {
  console.log('\n📂 Chat üzenetek (subcollections) törlése...');
  
  try {
    const chatsSnapshot = await db.collection('chats').get();
    let totalMessages = 0;
    
    for (const chatDoc of chatsSnapshot.docs) {
      const messagesSnapshot = await chatDoc.ref.collection('messages').get();
      
      if (!messagesSnapshot.empty) {
        const batch = db.batch();
        messagesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        totalMessages += messagesSnapshot.size;
      }
    }
    
    console.log(`  ✅ ${totalMessages} chat üzenet törölve`);
    return totalMessages;
  } catch (error) {
    console.log(`  ❌ Subcollection hiba: ${error.message}`);
    return 0;
  }
}

async function deleteEverything() {
  console.log('═'.repeat(60));
  console.log('⚠️  FIGYELEM: MINDEN ADAT TÖRLÉSE (ADMIN IS!)');
  console.log('═'.repeat(60));
  console.log('\n⏳ A törlés 5 másodperc múlva kezdődik...');
  console.log('   Nyomj CTRL+C-t a megszakításhoz!\n');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('🚀 Törlés megkezdése...');
  
  let totalDeleted = 0;
  
  // 1. Chat üzenetek törlése (subcollections)
  totalDeleted += await deleteSubcollections();
  
  // 2. Összes kollekció törlése
  for (const collection of COLLECTIONS_TO_DELETE) {
    totalDeleted += await deleteCollection(collection);
  }
  
  // 3. Auth felhasználók törlése (mindegyik!)
  const authDeleted = await deleteAllAuthUsers();
  
  console.log('\n' + '═'.repeat(60));
  console.log('✨ TÖRLÉS BEFEJEZVE!');
  console.log('═'.repeat(60));
  console.log(`📊 Összesen ${totalDeleted} Firestore dokumentum törölve`);
  console.log(`📊 Összesen ${authDeleted} Auth felhasználó törölve`);
  console.log('\n🏁 Az adatbázis teljesen üres.');
  
  process.exit(0);
}

deleteEverything().catch(error => {
  console.error('❌ Kritikus hiba:', error);
  process.exit(1);
});
