"use client";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const ADMIN_EMAILS = ['epresla@icloud.com'];

export default function AdminPage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user || !ADMIN_EMAILS.includes(user.email)) {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && ADMIN_EMAILS.includes(user.email)) {
      loadUsers();
    }
  }, [user]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('Biztosan törölni szeretnéd ezt a felhasználót?')) return;
    
    try {
      await deleteDoc(doc(db, 'users', userId));
      setUsers(users.filter(u => u.id !== userId));
      alert('Felhasználó törölve');
    } catch (error) {
      alert('Hiba történt a törlés során: ' + error.message);
    }
  };

  if (loading || !user || !ADMIN_EMAILS.includes(user.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Betöltés...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
          <p className="text-gray-600">Üdvözöl a CareConnect admin felület</p>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => router.push('/pharmagister')}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              ← Vissza a Pharmagister-hez
            </button>
            <button
              onClick={() => router.push('/admin/approvals')}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
            >
              📋 NNK Jóváhagyások
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Regisztrált felhasználók ({users.length})</h2>
          
          {loadingUsers ? (
            <div className="text-center py-8">Betöltés...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Még nincsenek felhasználók</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Email</th>
                    <th className="text-left py-3 px-4">Szerep</th>
                    <th className="text-left py-3 px-4">Profil kész</th>
                    <th className="text-left py-3 px-4">Regisztráció</th>
                    <th className="text-left py-3 px-4">Műveletek</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{user.email}</td>
                      <td className="py-3 px-4">
                        {user.pharmagisterRole ? (
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">
                            {user.pharmagisterRole}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {user.pharmaProfileComplete ? (
                          <span className="text-green-600">✓ Kész</span>
                        ) : (
                          <span className="text-orange-600">⚠ Hiányos</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('hu-HU') : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Törlés
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
