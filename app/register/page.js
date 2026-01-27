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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      
      // Egyedi verification token generálása
      const verificationToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: userCredential.user.email,
        createdAt: new Date().toISOString(),
        pharmagisterRole: null,
        pharmaProfileComplete: false,
        emailVerified: false,
        verificationToken: verificationToken,
        verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });

      // Custom verification email küldése Resend-del
      const response = await fetch('/api/send-custom-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userCredential.user.email,
          verificationToken: verificationToken
        })
      });

      if (!response.ok) {
        console.error('Email küldési hiba');
      }

      // Kijelentkeztetjük a usert
      await signOut(auth);
      
      // Success üzenet megjelenítése
      setSuccess(true);
      setLoading(false);
    } catch (err) {
      console.error('Registration error:', err);
      setLoading(false);
      
      if (err.code === 'auth/email-already-in-use') {
        setError('Ez az email cím már használatban van');
      } else {
        setError('Hiba történt a regisztráció során: ' + err.message);
      }
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-purple-100 to-pink-100">
      <div className="h-full overflow-y-auto p-4 py-8">
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-md w-full mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2">Regisztráció</h1>
        <p className="text-gray-600 text-center mb-6">Pharmagister</p>

        {success ? (
          <div className="text-center py-6">
            <div className="mb-4 text-6xl">✉️</div>
            <h2 className="text-2xl font-bold mb-3 text-green-600">Regisztráció sikeres!</h2>
            <p className="text-gray-700 mb-2">
              Küldtünk egy aktiváló emailt a <strong>{email}</strong> címre.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-800 mb-2">
                ✅ <strong>Email elküldve!</strong> Hamarosan megérkezik (1-2 percen belül).
              </p>
              <p className="text-sm text-green-800">
                📬 Az email közvetlenül a Beérkező mappába kerül (nem spam).
              </p>
            </div>
            <p className="text-gray-600 mb-6 text-sm">
              Kattints az emailben található linkre a fiókod aktiválásához.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-semibold"
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
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none pr-12"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 hover:text-gray-900 text-xl"
              >
                <span className={showPassword ? '' : 'opacity-40'}>👁️</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Jelszó megerősítése</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none pr-12"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 hover:text-gray-900 text-xl"
              >
                <span className={showConfirmPassword ? '' : 'opacity-40'}>👁️</span>
              </button>
            </div>
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
    </div>
  );
}
