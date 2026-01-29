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

const OLD_USER_ID = 'HBnESxUbVXhdQlpnX1pz3PVQM1P2';
const CORRECT_AUTH_UID = 'eegiIb8G5ZfAtTyLc6EF0aKAgHo2';

async function fixUserDocument() {
  console.log('🔧 FIXING USER DOCUMENT\n');
  console.log('Old ID:', OLD_USER_ID);
  console.log('Correct Auth UID:', CORRECT_AUTH_UID);
  console.log('');

  // 1. Get the old user document data
  const oldUserDoc = await db.collection('users').doc(OLD_USER_ID).get();
  
  if (!oldUserDoc.exists) {
    console.log('❌ Old user document not found');
    return;
  }
  
  const userData = oldUserDoc.data();
  console.log('✅ Found old user data:', userData.email, userData.name || userData.displayName);

  // 2. Check if correct UID document exists
  const correctUserDoc = await db.collection('users').doc(CORRECT_AUTH_UID).get();
  
  if (correctUserDoc.exists) {
    console.log('⚠️ Correct UID document already exists, merging...');
    // Merge data, keeping existing data but adding missing fields
    await db.collection('users').doc(CORRECT_AUTH_UID).set({
      ...userData,
      ...correctUserDoc.data(),
    }, { merge: true });
  } else {
    // 3. Create new document with correct UID
    await db.collection('users').doc(CORRECT_AUTH_UID).set(userData);
    console.log('✅ Created new user document with correct UID');
  }

  // 4. Move notifications from old ID to new ID
  console.log('\n📧 Moving notifications...');
  const notificationsSnap = await db.collection('notifications')
    .where('userId', '==', OLD_USER_ID)
    .get();
  
  console.log(`Found ${notificationsSnap.size} notifications to update`);
  
  for (const notifDoc of notificationsSnap.docs) {
    await notifDoc.ref.update({ userId: CORRECT_AUTH_UID });
  }
  console.log('✅ Notifications updated');

  // 5. Update pharmaDemands where pharmacyId is the old ID
  console.log('\n📋 Updating pharmaDemands...');
  const demandsSnap = await db.collection('pharmaDemands')
    .where('pharmacyId', '==', OLD_USER_ID)
    .get();
  
  console.log(`Found ${demandsSnap.size} demands to update`);
  
  for (const demandDoc of demandsSnap.docs) {
    await demandDoc.ref.update({ pharmacyId: CORRECT_AUTH_UID });
  }
  console.log('✅ Demands updated');

  // 6. Update pharmaApplications where applicantId is the old ID
  console.log('\n📝 Updating pharmaApplications...');
  const applicationsSnap = await db.collection('pharmaApplications')
    .where('applicantId', '==', OLD_USER_ID)
    .get();
  
  console.log(`Found ${applicationsSnap.size} applications to update`);
  
  for (const appDoc of applicationsSnap.docs) {
    await appDoc.ref.update({ applicantId: CORRECT_AUTH_UID });
  }
  console.log('✅ Applications updated');

  // 7. Update chats where user is a member
  console.log('\n💬 Updating chats...');
  const chatsSnap = await db.collection('chats')
    .where('members', 'array-contains', OLD_USER_ID)
    .get();
  
  console.log(`Found ${chatsSnap.size} chats to update`);
  
  for (const chatDoc of chatsSnap.docs) {
    const chatData = chatDoc.data();
    const newMembers = chatData.members.map(m => m === OLD_USER_ID ? CORRECT_AUTH_UID : m);
    
    // Update memberInfo if exists
    const memberInfo = chatData.memberInfo || {};
    if (memberInfo[OLD_USER_ID]) {
      memberInfo[CORRECT_AUTH_UID] = memberInfo[OLD_USER_ID];
      delete memberInfo[OLD_USER_ID];
    }
    
    await chatDoc.ref.update({ 
      members: newMembers,
      memberInfo: memberInfo
    });
  }
  console.log('✅ Chats updated');

  // 8. Delete old user document
  console.log('\n🗑️ Deleting old user document...');
  await db.collection('users').doc(OLD_USER_ID).delete();
  console.log('✅ Old document deleted');

  console.log('\n✅✅✅ FIX COMPLETE! ✅✅✅');
  console.log('User document now has correct Auth UID:', CORRECT_AUTH_UID);
}

fixUserDocument().then(() => process.exit(0)).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
