"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('A jelszavak nem egyeznek');
      return;
    }

    if (password.length < 6) {
      setError('A jelszónak legalább 6 karakter hosszúnak kell lennie');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: userCredential.user.email,
        createdAt: new Date().toISOString(),
        pharmagisterRole: null,
        pharmaProfileComplete: false
      });

      // Aktiváló email küldése
      await sendEmailVerification(userCredential.user);

      // Kijelentkeztetjük a usert
      await signOut(auth);

      // Success üzenet megjelenítése
      setSuccess(true);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      
      if (err.code === 'auth/email-already-in-use') {
        setError('Ez az email cím már használatban van');
      } else {
        setError('Hiba történt a regisztráció során: ' + err.message);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-2">Regisztráció</h1>
        <p className="text-gray-600 text-center mb-6">Pharmagister</p>

        {success ? (
          <div className="text-center py-6">
            <div className="mb-4 text-6xl">✉️</div>
            <h2 className="text-2xl font-bold mb-3 text-green-600">Regisztráció sikeres!</h2>
            <p className="text-gray-700 mb-4">
              Küldtünk egy aktiváló emailt a <strong>{email}</strong> címre.
            </p>
            <p className="text-gray-600 mb-6">
              Kérjük, ellenőrizd a postaládádat és kattints az aktiváló linkre a folytatáshoz.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
            >
              Vissza a bejelentkezéshez
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Jelszó</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Jelszó megerősítése</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Betöltés...' : 'Regisztrálok'}
          </button>
        </form>

        <p className="text-center mt-4 text-sm">
          Már van fiókod?{' '}
          <button
            onClick={() => router.push('/login')}
            className="text-purple-600 hover:underline"
          >
            Bejelentkezés
          </button>
        </p>
        </>
        )}
      </div>
    </div>
  );
}
