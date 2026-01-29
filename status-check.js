require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// A te userId-d
const EPRESL_USER_ID = 'HBnESxUbVXhdQlpnX1pz3PVQM1P2';

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

async function checkAndReportStatus() {
  console.log('📊 ÁLLAPOT ELLENŐRZÉS');
  console.log('=====================\n');
  
  // 1. Ellenőrizzük a user-t
  const userDoc = await db.collection('users').doc(EPRESL_USER_ID).get();
  if (userDoc.exists) {
    const userData = userDoc.data();
    console.log('✅ User megtalálva:', userData.email);
    console.log('   - Név:', userData.name || userData.displayName);
    console.log('   - Szerep:', userData.pharmagisterRole);
  } else {
    console.log('❌ User nem található!');
  }
  
  // 2. Push subscriptions
  console.log('\n📱 PUSH SUBSCRIPTIONS:');
  const allSubs = await db.collection('pushSubscriptions').get();
  console.log(`   Összes subscription: ${allSubs.size}`);
  
  const userSubs = await db.collection('pushSubscriptions').where('userId', '==', EPRESL_USER_ID).get();
  console.log(`   Te subscription-jeid: ${userSubs.size}`);
  
  if (userSubs.size > 0) {
    userSubs.docs.forEach(doc => {
      const data = doc.data();
      console.log(`   - ${doc.id}`);
      console.log(`     endpoint: ${data.subscription?.endpoint?.substring(0, 50)}...`);
    });
  }
  
  // 3. Notifications
  console.log('\n🔔 ÉRTESÍTÉSEK:');
  const notifs = await db.collection('notifications')
    .where('userId', '==', EPRESL_USER_ID)
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();
  
  console.log(`   Összes értesítésed: ${notifs.size}`);
  notifs.docs.forEach(doc => {
    const data = doc.data();
    console.log(`   - ${data.title} (${data.read ? 'olvasott' : 'OLVASATLAN'})`);
  });
  
  // 4. VAPID kulcsok
  console.log('\n🔑 VAPID KONFIGURÁCIÓ:');
  console.log(`   VAPID_PUBLIC_KEY: ${process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? 'OK (' + process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY.substring(0, 20) + '...)' : 'HIÁNYZIK!'}`);
  console.log(`   VAPID_PRIVATE_KEY: ${process.env.VAPID_PRIVATE_KEY ? 'OK' : 'HIÁNYZIK!'}`);
  
  console.log('\n=====================');
  console.log('📌 KÖVETKEZŐ LÉPÉS:');
  if (userSubs.size === 0) {
    console.log('   A push subscription nincs mentve a te fiókodhoz.');
    console.log('   Menj a Settings > Értesítések oldalra és nyomd meg a "Bekapcsolás" gombot.');
    console.log('   Utána nézd meg a böngésző konzolt hibákért.');
  } else {
    console.log('   Van push subscription - futtasd újra a test-push.js-t!');
  }
}

checkAndReportStatus().then(() => process.exit(0));
