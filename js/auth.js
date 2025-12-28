import { auth, googleProvider, db } from './config.js';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { doc, setDoc, getDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { showToast, updateElementText, toggleModal } from './ui.js';

let currentUser = null;

// Initialize Auth Listener
export function initAuth(onUserChange) {
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (user) {
            // Check if user exists in DB, if not create
            await ensureUserProfile(user);
        }
        onUserChange(user);
    });
}

// User Profile Management
async function ensureUserProfile(user) {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        await setDoc(userRef, {
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL,
            karma: 0,
            joinedAt: new Date()
        });
    }
}

export async function getUserData(uid) {
    if (!uid) return null;
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() ? userSnap.data() : null;
}

// Auth Actions
export async function loginWithGoogle() {
    try {
        await signInWithPopup(auth, googleProvider);
        showToast('Welcome back!', 'success');
        toggleModal('auth-modal', false);
    } catch (error) {
        console.error(error);
        showToast(error.message, 'error');
    }
}

export async function loginWithEmail(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('Logged in successfully', 'success');
        toggleModal('auth-modal', false);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

export async function signupWithEmail(email, password) {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await ensureUserProfile(result.user);
        showToast('Account created!', 'success');
        toggleModal('auth-modal', false);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

export async function logout() {
    try {
        await signOut(auth);
        showToast('Logged out', 'info');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

export function getCurrentUser() {
    return currentUser;
}
