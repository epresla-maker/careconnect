"use client";
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading, success, error, expired
  const [message, setMessage] = useState('Email cím ellenőrzése...');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Érvénytelen verifikációs link');
        return;
      }

      try {
        // Keressük meg a user-t a token alapján - query használata
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('verificationToken', '==', token));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setStatus('error');
          setMessage('Érvénytelen vagy már felhasznált verifikációs link');
          return;
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        // Ellenőrizzük a lejáratot
        if (new Date(userData.verificationTokenExpires) < new Date()) {
          setStatus('expired');
          setMessage('A verifikációs link lejárt. Kérj új linket.');
          return;
        }

        // Email megerősítése
        await updateDoc(doc(db, 'users', userDoc.id), {
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpires: null
        });

        setStatus('success');
        setMessage('Email cím sikeresen megerősítve! ✅');
        
        // 3 mp múlva átirányítás
        setTimeout(() => {
          router.push('/login?verified=true');
        }, 3000);

      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage('Hiba történt az email megerősítése során');
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold mb-2">{message}</h1>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-green-600 mb-2">Sikeres!</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Átirányítás a bejelentkezéshez...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-red-600 mb-2">Hiba</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <button
              onClick={() => router.push('/register')}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
            >
              Vissza a regisztrációhoz
            </button>
          </>
        )}

        {status === 'expired' && (
          <>
            <div className="text-6xl mb-4">⏰</div>
            <h1 className="text-2xl font-bold text-orange-600 mb-2">Lejárt</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <button
              onClick={() => router.push('/login')}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
            >
              Új link kérése
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
