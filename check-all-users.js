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

async function checkAllUsers() {
  console.log('🔍 CHECKING ALL USERS FOR ID MISMATCH\n');
  
  const usersSnap = await db.collection('users').get();
  let problemCount = 0;
  
  for (const userDoc of usersSnap.docs) {
    const userData = userDoc.data();
    const firestoreId = userDoc.id;
    
    if (!userData.email) continue;
    
    try {
      // Get Firebase Auth user by email
      const authUser = await admin.auth().getUserByEmail(userData.email);
      
      if (authUser.uid !== firestoreId) {
        problemCount++;
        console.log('❌ MISMATCH FOUND:');
        console.log('   Email:', userData.email);
        console.log('   Firestore doc ID:', firestoreId);
        console.log('   Auth UID:', authUser.uid);
        console.log('');
      }
    } catch (err) {
      // User might not exist in Auth (deleted)
      if (err.code === 'auth/user-not-found') {
        console.log('⚠️ No Auth user for:', userData.email, '(Firestore ID:', firestoreId, ')');
      }
    }
  }
  
  if (problemCount === 0) {
    console.log('✅ All users have matching Firestore doc ID and Auth UID!');
  } else {
    console.log(`\n❌ Found ${problemCount} users with mismatched IDs`);
  }
}

checkAllUsers().then(() => process.exit(0));
