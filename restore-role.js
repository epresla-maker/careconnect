// Restore pharmagisterRole for epresla@icloud.com
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, updateDoc, doc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDZzJ5R5kW8jH4nV9xjF3qXyR_vK8J4Y5U",
  authDomain: "pharmacare-dfa3c.firebaseapp.com",
  projectId: "pharmacare-dfa3c",
  storageBucket: "pharmacare-dfa3c.firebasestorage.app",
  messagingSenderId: "467924912648",
  appId: "1:467924912648:web:c1a4e5b6c7d8e9f0a1b2c3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function restoreRole() {
  try {
    // Find user by email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', 'epresla@icloud.com'));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('❌ User not found');
      return;
    }
    
    let userId = null;
    let currentData = null;
    querySnapshot.forEach((docSnap) => {
      userId = docSnap.id;
      currentData = docSnap.data();
      console.log('📄 Current user data:', {
        email: currentData.email,
        displayName: currentData.displayName,
        pharmagisterRole: currentData.pharmagisterRole,
        pharmacyName: currentData.pharmacyName
      });
    });
    
    if (!userId) return;
    
    // Determine role based on existing data
    let role = null;
    if (currentData.pharmacyName) {
      role = 'pharmacy';
      console.log('🏥 Detected pharmacy user');
    } else if (currentData.pharmaYearsOfExperience) {
      role = 'pharmacist'; // or 'assistant' - you need to choose
      console.log('💊 Detected substitute user - defaulting to pharmacist');
    }
    
    if (!role) {
      console.log('⚠️  Cannot determine role. Please specify manually.');
      console.log('Run with: node restore-role.js pharmacy');
      console.log('Or: node restore-role.js pharmacist');
      console.log('Or: node restore-role.js assistant');
      
      // Check command line argument
      if (process.argv[2]) {
        role = process.argv[2];
        if (!['pharmacy', 'pharmacist', 'assistant'].includes(role)) {
          console.log('❌ Invalid role. Must be: pharmacy, pharmacist, or assistant');
          return;
        }
      } else {
        return;
      }
    }
    
    // Update the role
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      pharmagisterRole: role
    });
    
    console.log(`✅ Successfully restored pharmagisterRole to: ${role}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

restoreRole();
