import { db } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request) {
  try {
    const { userId, subscription } = await request.json();

    if (!userId || !subscription) {
      return Response.json({ error: 'userId and subscription are required' }, { status: 400 });
    }

    // Check if subscription already exists
    const existingQuery = await db.collection('pushSubscriptions')
      .where('userId', '==', userId)
      .where('subscription.endpoint', '==', subscription.endpoint)
      .get();

    if (!existingQuery.empty) {
      // Update existing subscription
      const docId = existingQuery.docs[0].id;
      await db.collection('pushSubscriptions').doc(docId).update({
        subscription,
        updatedAt: FieldValue.serverTimestamp()
      });
      return Response.json({ success: true, message: 'Subscription updated', id: docId });
    }

    // Create new subscription
    const docRef = await db.collection('pushSubscriptions').add({
      userId,
      subscription,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    return Response.json({ success: true, message: 'Subscription saved', id: docRef.id });

  } catch (error) {
    console.error('Save subscription error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { userId, endpoint } = await request.json();

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 });
    }

    let query = db.collection('pushSubscriptions').where('userId', '==', userId);
    
    if (endpoint) {
      query = query.where('subscription.endpoint', '==', endpoint);
    }

    const snapshot = await query.get();
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    return Response.json({ success: true, deleted: snapshot.size });

  } catch (error) {
    console.error('Delete subscription error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
