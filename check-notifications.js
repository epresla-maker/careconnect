const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Firebase config from your project
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkNotifications() {
  try {
    const snapshot = await getDocs(collection(db, 'notifications'));
    
    console.log(`\nÖsszesen ${snapshot.size} értesítés van a Firestore-ban:\n`);
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('ID:', doc.id);
      console.log('UserId:', data.userId);
      console.log('Type:', data.type);
      console.log('Title:', data.title);
      console.log('Message:', data.message);
      console.log('Read:', data.read);
      console.log('Created:', data.createdAt?.toDate?.() || data.createdAt);
      console.log('---\n');
    });
  } catch (error) {
    console.error('Hiba:', error.message);
  }
  
  process.exit(0);
}

checkNotifications();
