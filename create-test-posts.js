// create-test-posts.js - Admin script to create test posts
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function createTestPosts() {
  console.log('🚀 Creating test posts...');
  
  try {
    // Test Post 1: Pharmagister Demand (Helyettesítési igény)
    const post1 = await db.collection('serviceFeedPosts').add({
      postType: 'pharmaDemand',
      userId: 'test-user-1',
      pharmacyName: 'Patika Gyógyszertár',
      pharmacyZipCode: '1055',
      pharmacyCity: 'Budapest',
      positionLabel: 'Gyógyszerész',
      date: new Date('2025-02-01').toISOString(),
      workHours: '8:00 - 16:00',
      minExperience: '2 év tapasztalat',
      maxHourlyRate: 3500,
      requiredSoftware: ['Pharma+', 'WinMentor'],
      additionalRequirements: 'Sürgős helyettesítés, lehetőleg azonnali kezdéssel.',
      pharmaDemandId: 'demand-001',
      createdAt: admin.firestore.Timestamp.now(),
      reactions: {},
      comments: []
    });
    console.log('✅ Created pharmaDemand post:', post1.id);

    // Test Post 2: User Post (Általános poszt)
    const post2 = await db.collection('serviceFeedPosts').add({
      postType: 'userPost',
      userId: 'test-user-2',
      text: 'Keresem a legjobb NEAK software-t gyógyszertárakhoz. Van valakinek tapasztalata?',
      authorData: {
        displayName: 'Dr. Kovács Anna',
        photoURL: 'https://via.placeholder.com/100',
        profession: 'Gyógyszerész'
      },
      createdAt: admin.firestore.Timestamp.now(),
      reactions: {},
      comments: []
    });
    console.log('✅ Created userPost:', post2.id);

    // Test Post 3: Another Pharmagister Demand
    const post3 = await db.collection('serviceFeedPosts').add({
      postType: 'pharmaDemand',
      userId: 'test-user-3',
      pharmacyName: 'Rózsadomb Patika',
      pharmacyZipCode: '1026',
      pharmacyCity: 'Budapest',
      positionLabel: 'Technikus',
      date: new Date('2025-01-28').toISOString(),
      workHours: '14:00 - 20:00',
      minExperience: '1 év tapasztalat',
      maxHourlyRate: 2800,
      requiredSoftware: ['WinMentor'],
      additionalRequirements: 'Délutáni műszak, tapasztalt technikus jelentkezését várjuk.',
      pharmaDemandId: 'demand-002',
      createdAt: admin.firestore.Timestamp.now(),
      reactions: {},
      comments: []
    });
    console.log('✅ Created pharmaDemand post:', post3.id);

    // Test Post 4: User Post with Image
    const post4 = await db.collection('serviceFeedPosts').add({
      postType: 'userPost',
      userId: 'test-user-4',
      text: 'Mai nap a patikában 💊✨',
      imageUrl: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=600',
      authorData: {
        displayName: 'Nagy Péter',
        photoURL: 'https://via.placeholder.com/100',
        profession: 'Gyógyszerész'
      },
      createdAt: admin.firestore.Timestamp.now(),
      reactions: {},
      comments: []
    });
    console.log('✅ Created userPost with image:', post4.id);

    console.log('\n✅ All test posts created successfully!');
    console.log('🎉 You can now view them in the feed at http://localhost:3000');
    
  } catch (error) {
    console.error('❌ Error creating test posts:', error);
  }
  
  process.exit(0);
}

createTestPosts();
