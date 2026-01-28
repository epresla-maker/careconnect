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

(async () => {
  try {
    console.log('🗑️  Az összes igény törlése...');
    
    const demandsSnapshot = await db.collection('pharmaDemands').get();
    console.log(`📊 Talált igények száma: ${demandsSnapshot.size}`);
    
    if (demandsSnapshot.empty) {
      console.log('✅ Nincs törlendő igény!');
      process.exit(0);
    }
    
    const batch = db.batch();
    demandsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`✅ ${demandsSnapshot.size} igény sikeresen törölve!`);
    
    // Törölni kellene a kapcsolódó serviceFeedPosts-okat is?
    const feedPostsSnapshot = await db.collection('serviceFeedPosts')
      .where('postType', '==', 'pharmaDemand')
      .get();
    
    if (!feedPostsSnapshot.empty) {
      console.log(`📊 Kapcsolódó feed postok: ${feedPostsSnapshot.size}`);
      const feedBatch = db.batch();
      feedPostsSnapshot.docs.forEach(doc => {
        feedBatch.delete(doc.ref);
      });
      await feedBatch.commit();
      console.log(`✅ ${feedPostsSnapshot.size} feed post törölve!`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Hiba:', error.message);
    process.exit(1);
  }
})();
