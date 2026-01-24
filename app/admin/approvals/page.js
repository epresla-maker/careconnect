"use client";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const ADMIN_EMAILS = ['epresla@icloud.com'];

export default function ApprovalsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [approvals, setApprovals] = useState([]);
  const [loadingApprovals, setLoadingApprovals] = useState(true);
  const [filter, setFilter] = useState('pending'); // 'all', 'pending', 'approved', 'rejected'

  useEffect(() => {
    if (!loading) {
      if (!user || !ADMIN_EMAILS.includes(user.email)) {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && ADMIN_EMAILS.includes(user.email)) {
      loadApprovals();
    }
  }, [user, filter]);

  const loadApprovals = async () => {
    setLoadingApprovals(true);
    try {
      let q;
      if (filter === 'all') {
        q = query(collection(db, 'pharmagisterApprovals'), orderBy('submittedAt', 'desc'));
      } else {
        q = query(
          collection(db, 'pharmagisterApprovals'),
          where('status', '==', filter),
          orderBy('submittedAt', 'desc')
        );
      }
      
      const snapshot = await getDocs(q);
      const approvalsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate()
      }));
      setApprovals(approvalsData);
    } catch (error) {
      console.error('Error loading approvals:', error);
      alert('Hiba történt a jóváhagyási kérelmek betöltése során.');
    } finally {
      setLoadingApprovals(false);
    }
  };

  const handleApprove = async (approval) => {
    if (!confirm(`Biztosan jóváhagyod ezt a profilt?\n\n${approval.userName} (${approval.userEmail})\nSzerep: ${approval.role}\nNNK: ${approval.nkkNumber}`)) {
      return;
    }

    try {
      // Frissítjük a user profilját
      const userRef = doc(db, 'users', approval.userId);
      await updateDoc(userRef, {
        pharmaProfileComplete: true,
        pharmaApproved: true,
        pharmaApprovedAt: new Date().toISOString(),
        pharmaApprovedBy: user.email
      });

      // Frissítjük a jóváhagyási kérelmet
      const approvalRef = doc(db, 'pharmagisterApprovals', approval.id);
      await updateDoc(approvalRef, {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: user.email
      });

      // Értesítés küldése a usernek
      await addDoc(collection(db, 'notifications'), {
        userId: approval.userId,
        type: 'approval_approved',
        title: '✅ Pharmagister profil jóváhagyva!',
        message: `Gratulálunk! A Pharmagister profilod sikeresen jóváhagyásra került. Most már teljes funkcióval használhatod a platformot.`,
        read: false,
        createdAt: serverTimestamp()
      });

      alert('✅ Profil jóváhagyva!');
      loadApprovals();
    } catch (error) {
      console.error('Error approving:', error);
      alert('Hiba történt a jóváhagyás során: ' + error.message);
    }
  };

  const handleReject = async (approval) => {
    const reason = prompt(`Add meg az elutasítás okát:\n\n${approval.userName} (${approval.userEmail})`);
    if (!reason) return;

    try {
      // Frissítjük a jóváhagyási kérelmet
      const approvalRef = doc(db, 'pharmagisterApprovals', approval.id);
      await updateDoc(approvalRef, {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: user.email,
        rejectionReason: reason
      });

      // Frissítjük a user profilját
      const userRef = doc(db, 'users', approval.userId);
      await updateDoc(userRef, {
        pharmaProfileComplete: false,
        pharmaApproved: false,
        pharmaRejectionReason: reason
      });

      // Értesítés küldése a usernek
      await addDoc(collection(db, 'notifications'), {
        userId: approval.userId,
        type: 'approval_rejected',
        title: '❌ Pharmagister profil elutasítva',
        message: `A Pharmagister profilod elutasításra került. Indok: ${reason}\n\nKérjük, javítsd a hibákat és küldd be újra!`,
        read: false,
        createdAt: serverTimestamp()
      });

      alert('❌ Profil elutasítva!');
      loadApprovals();
    } catch (error) {
      console.error('Error rejecting:', error);
      alert('Hiba történt az elutasítás során: ' + error.message);
    }
  };

  const handleDelete = async (approvalId) => {
    if (!confirm('Biztosan törölni szeretnéd ezt a jóváhagyási kérelmet?')) return;
    
    try {
      await deleteDoc(doc(db, 'pharmagisterApprovals', approvalId));
      setApprovals(approvals.filter(a => a.id !== approvalId));
      alert('Kérelem törölve');
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
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 lg:p-6">
      <div className="max-w-[420px] sm:max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">NNK Jóváhagyások</h1>
          <p className="text-sm sm:text-base text-gray-600 mb-4">Pharmagister profil jóváhagyások NNK szám ellenőrzéssel</p>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => router.push('/admin')}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              ← Vissza
            </button>
            <button
              onClick={() => router.push('/pharmagister')}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              Pharmagister
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg ${filter === 'pending' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              ⏳ Függőben ({approvals.filter(a => a.status === 'pending').length})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-lg ${filter === 'approved' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              ✅ Jóváhagyva
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-4 py-2 rounded-lg ${filter === 'rejected' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              ❌ Elutasítva
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              📋 Mind
            </button>
          </div>
        </div>

        {/* Approvals list */}
        <div className="space-y-4">
          {loadingApprovals ? (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">Betöltés...</div>
          ) : approvals.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-500">
              Nincs megjeleníthető kérelem
            </div>
          ) : (
            approvals.map(approval => (
              <div key={approval.id} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{approval.userName}</h3>
                    <p className="text-gray-600">{approval.userEmail}</p>
                  </div>
                  <div className="text-right">
                    {approval.status === 'pending' && (
                      <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                        ⏳ Függőben
                      </span>
                    )}
                    {approval.status === 'approved' && (
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                        ✅ Jóváhagyva
                      </span>
                    )}
                    {approval.status === 'rejected' && (
                      <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                        ❌ Elutasítva
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Szerep</label>
                    <p className="text-lg">
                      {approval.role === 'pharmacy' && 'Gyógysztár'}
                      {approval.role === 'pharmacist' && 'Gyógyszerész'}
                      {approval.role === 'assistant' && 'Szakasszisztens'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">NNK Szám</label>
                    <p className="text-lg font-mono font-bold text-purple-600">{approval.nkkNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Beküldve</label>
                    <p className="text-sm">{approval.submittedAt?.toLocaleString('hu-HU')}</p>
                  </div>
                </div>

                {/* Role specific data */}
                {approval.role === 'pharmacy' && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <h4 className="font-semibold mb-2">Gyógyszertár adatok:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div><strong>Név:</strong> {approval.pharmacyName}</div>
                      <div><strong>Telefon:</strong> {approval.pharmacyPhone}</div>
                      <div><strong>Email:</strong> {approval.pharmacyEmail}</div>
                      <div><strong>Cím:</strong> {approval.pharmacyZipCode} {approval.pharmacyCity}, {approval.pharmacyAddress}</div>
                    </div>
                  </div>
                )}

                {(approval.role === 'pharmacist' || approval.role === 'assistant') && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <h4 className="font-semibold mb-2">Helyettesítő adatok:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div><strong>Tapasztalat:</strong> {approval.pharmaYearsOfExperience} év</div>
                      <div><strong>Óradíj:</strong> {approval.pharmaHourlyRate || '-'} Ft</div>
                      <div><strong>Szoftverek:</strong> {approval.pharmaSoftwareKnowledge?.join(', ') || '-'}</div>
                    </div>
                    {approval.pharmaBio && (
                      <div className="mt-2">
                        <strong>Bemutatkozás:</strong>
                        <p className="text-gray-700 mt-1">{approval.pharmaBio}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Rejection reason */}
                {approval.status === 'rejected' && approval.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
                    <h4 className="font-semibold text-red-800 mb-1">Elutasítás oka:</h4>
                    <p className="text-red-700">{approval.rejectionReason}</p>
                    <p className="text-xs text-red-600 mt-2">
                      Elutasította: {approval.rejectedBy} - {new Date(approval.rejectedAt).toLocaleString('hu-HU')}
                    </p>
                  </div>
                )}

                {/* Approval info */}
                {approval.status === 'approved' && (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-4">
                    <p className="text-green-700 text-sm">
                      ✅ Jóváhagyta: {approval.approvedBy} - {new Date(approval.approvedAt).toLocaleString('hu-HU')}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {approval.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(approval)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                      >
                        ✅ Jóváhagy
                      </button>
                      <button
                        onClick={() => handleReject(approval)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                      >
                        ❌ Elutasít
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(approval.id)}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                  >
                    🗑️ Törlés
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
