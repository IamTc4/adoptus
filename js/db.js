import { db, storage } from './config.js';
import { collection, addDoc, getDocs, query, where, GeoPoint, doc, updateDoc, increment, orderBy } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

/*
  SECURITY RULES (Conceptual):
  match /posts/{postId} {
    allow read: if true;
    allow create: if request.auth != null;
    allow update: if request.auth.uid == resource.data.userId;
  }
  match /users/{userId} {
    allow read: if true;
    allow write: if request.auth.uid == userId;
  }
*/

const POSTS_COLLECTION = "posts";

// --- Storage & Compression ---

export async function compressAndUploadImage(file) {
    // 1. Compress
    const compressedBlob = await compressImage(file);

    // 2. Upload
    const fileName = `posts/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const storageRef = ref(storage, fileName);
    const snapshot = await uploadBytes(storageRef, compressedBlob);

    // 3. Get URL
    return await getDownloadURL(snapshot.ref);
}

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const maxWidth = 800;
        const quality = 0.6;
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let w = img.width;
                let h = img.height;
                if (w > maxWidth) {
                    h = Math.round((h * maxWidth) / w);
                    w = maxWidth;
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                canvas.toBlob(
                    (blob) => blob ? resolve(blob) : reject(new Error("Compression failed")),
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

// --- Firestore Operations ---

export async function createPost(postData, user) {
    const docRef = await addDoc(collection(db, POSTS_COLLECTION), {
        ...postData,
        userId: user.uid,
        userDisplayName: user.displayName || 'Anonymous',
        status: 'stray', // stray, adopted
        timestamp: new Date()
    });

    // Increment Karma
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
        karma: increment(10)
    });

    return docRef.id;
}

/**
 * Fetch posts within rough 50km radius.
 * Lat: 1 deg ~ 111km. 50km ~ 0.45 deg.
 * We will use +/- 0.5 degrees for simplicity.
 */
export async function fetchNearbyPosts(centerLat, centerLng) {
    const latDelta = 0.5;
    const minLat = centerLat - latDelta;
    const maxLat = centerLat + latDelta;

    // Compound query restriction: Can only range filter on one field in vanilla Firestore without custom indexes.
    // Strategy: Filter by Lat range in DB, then Lng range + 50km radius check in client.

    const q = query(
        collection(db, POSTS_COLLECTION),
        where("location.lat", ">=", minLat),
        where("location.lat", "<=", maxLat)
        // Note: We can't easily orderBy timestamp if we have a range filter on location.lat
        // without a composite index. For MVP/Free tier ease, we'll sort client side.
    );

    const snapshot = await getDocs(q);
    const posts = [];

    snapshot.forEach(doc => {
        const data = doc.data();
        // Client-side Lng filter (approximate)
        if (Math.abs(data.location.lng - centerLng) < 0.6) { // slightly wider to be safe
             // Refine distance calculation could happen here
             posts.push({ id: doc.id, ...data });
        }
    });

    return posts;
}

export async function getUserPosts(uid) {
    const q = query(collection(db, POSTS_COLLECTION), where("userId", "==", uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function markAsAdopted(postId) {
    const postRef = doc(db, POSTS_COLLECTION, postId);
    await updateDoc(postRef, {
        status: 'adopted'
    });
}
