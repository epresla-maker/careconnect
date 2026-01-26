import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Firebase Admin inicializálás
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export async function POST(request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId kötelező' }, { status: 400 });
    }

    // 1. Firebase Authentication-ből törlés
    try {
      await admin.auth().deleteUser(userId);
      console.log('✅ User törölve Firebase Auth-ból:', userId);
    } catch (authError) {
      console.error('Auth törlési hiba:', authError);
      // Ha a user nem létezik Auth-ban, folytatjuk
      if (authError.code !== 'auth/user-not-found') {
        throw authError;
      }
    }

    // 2. Firestore-ból törlés
    await admin.firestore().collection('users').doc(userId).delete();
    console.log('✅ User törölve Firestore-ból:', userId);

    // 3. Kapcsolódó adatok törlése (opcionális)
    // Töröljük a user által létrehozott poszt-okat
    const postsSnapshot = await admin.firestore()
      .collection('servicePosts')
      .where('userId', '==', userId)
      .get();
    
    const deletePromises = postsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);
    console.log(`✅ ${postsSnapshot.size} db poszt törölve`);

    return NextResponse.json({ 
      success: true, 
      message: 'Felhasználó teljesen törölve',
      deletedPosts: postsSnapshot.size
    });

  } catch (error) {
    console.error('User törlési hiba:', error);
    return NextResponse.json({ 
      error: 'Törlési hiba',
      details: error.message 
    }, { status: 500 });
  }
}
