import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Firebase Admin inicializálás
if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
  } catch (initError) {
    console.error('❌ Firebase Admin init failed:', initError.message);
  }
}

export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token hiányzik' }, { status: 400 });
    }

    const db = admin.firestore();
    const usersRef = db.collection('users');
    
    // Keressük meg a user-t a token alapján
    const snapshot = await usersRef.where('verificationToken', '==', token).get();
    
    if (snapshot.empty) {
      return NextResponse.json({ 
        error: 'Érvénytelen vagy már felhasznált verifikációs link' 
      }, { status: 404 });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    // Ellenőrizzük a lejáratot
    if (new Date(userData.verificationTokenExpires) < new Date()) {
      return NextResponse.json({ 
        error: 'A verifikációs link lejárt. Kérj új linket.' 
      }, { status: 410 });
    }

    // Frissítsük a Firestore-t
    await usersRef.doc(userDoc.id).update({
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpires: null
    });

    // Frissítsük a Firebase Auth-ot is
    try {
      await admin.auth().updateUser(userDoc.id, {
        emailVerified: true
      });
      console.log('✅ Firebase Auth emailVerified frissítve:', userDoc.id);
    } catch (authError) {
      console.error('⚠️ Firebase Auth frissítés hiba:', authError.message);
      // Firestore már frissítve van, folytatjuk
    }

    return NextResponse.json({ 
      success: true,
      message: 'Email cím sikeresen megerősítve!'
    });

  } catch (error) {
    console.error('❌ Email verification error:', error);
    return NextResponse.json({ 
      error: 'Hiba történt az email megerősítése során',
      details: error.message 
    }, { status: 500 });
  }
}
