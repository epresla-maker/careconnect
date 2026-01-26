import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Firebase Admin inicializálás
if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    console.log('🔧 Initializing Firebase Admin with:');
    console.log('  Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
    console.log('  Client Email:', process.env.FIREBASE_CLIENT_EMAIL);
    console.log('  Private Key length:', privateKey?.length);
    console.log('  Private Key starts with:', privateKey?.substring(0, 50));
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    console.log('✅ Firebase Admin initialized successfully');
  } catch (initError) {
    console.error('❌ Firebase Admin init failed:', initError.message);
    console.error('Full error:', initError);
  }
}

export async function POST(request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId kötelező' }, { status: 400 });
    }

    console.log('🗑️ Törlés indul:', userId);

    // 1. Firebase Authentication-ből törlés
    try {
      await admin.auth().deleteUser(userId);
      console.log('✅ User törölve Firebase Auth-ból:', userId);
    } catch (authError) {
      console.error('⚠️ Auth törlési hiba:', authError.code, authError.message);
      // Ha a user nem létezik Auth-ban, folytatjuk
      if (authError.code !== 'auth/user-not-found') {
        return NextResponse.json({ 
          error: 'Auth törlési hiba',
          details: authError.message,
          code: authError.code
        }, { status: 500 });
      }
    }

    // 2. Firestore-ból törlés
    try {
      await admin.firestore().collection('users').doc(userId).delete();
      console.log('✅ User törölve Firestore-ból:', userId);
    } catch (firestoreError) {
      console.error('⚠️ Firestore törlési hiba:', firestoreError.message);
      return NextResponse.json({ 
        error: 'Firestore törlési hiba',
        details: firestoreError.message 
      }, { status: 500 });
    }

    // 3. Kapcsolódó adatok törlése (opcionális)
    try {
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
    } catch (postsError) {
      console.error('⚠️ Posztok törlési hiba:', postsError.message);
      // User már törölve, csak a posztok nem
      return NextResponse.json({ 
        success: true, 
        message: 'User törölve, de posztok törlése sikertelen',
        deletedPosts: 0,
        warning: postsError.message
      });
    }

  } catch (error) {
    console.error('❌ User törlési hiba:', error);
    return NextResponse.json({ 
      error: 'Törlési hiba',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
