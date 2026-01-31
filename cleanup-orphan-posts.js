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
  console.log('🔍 Árva serviceFeedPosts keresése...');
  
  const feedPosts = await db.collection('serviceFeedPosts').where('postType', '==', 'pharmaDemand').get();
  console.log('📊 Összes pharmaDemand típusú feed post:', feedPosts.size);
  
  let deletedCount = 0;
  
  for (const feedDoc of feedPosts.docs) {
    const data = feedDoc.data();
    const demandId = data.pharmaDemandId;
    
    if (demandId) {
      const demandDoc = await db.collection('pharmaDemands').doc(demandId).get();
      
      if (!demandDoc.exists) {
        console.log('🗑️ Árva post törölve:', feedDoc.id, '- demand ID:', demandId);
        await db.collection('serviceFeedPosts').doc(feedDoc.id).delete();
        deletedCount++;
      }
    }
  }
  
  console.log('✅ Összesen törölve:', deletedCount, 'árva post');
  process.exit(0);
})();
