import { initAuth, getCurrentUser, loginWithGoogle, loginWithEmail, signupWithEmail, logout, getUserData } from './auth.js';
import { initMap, renderMarkers, applyFilters, initWizardMap } from './map.js';
import { fetchNearbyPosts, createPost, compressAndUploadImage, markAsAdopted, getUserPosts } from './db.js';
import { showToast, toggleModal, updateElementText, renderAdoptionGrid } from './ui.js';

// Global State
let userLocation = { lat: 0, lng: 0 };
let wizardMapInstance = null;
let currentView = 'view-map';
let allPostsData = []; // Cache for both map and grid

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Init Auth
    initAuth(async (user) => {
        updateAuthUI(user);
    });

    // 2. Init Map (Loads default location first)
    initMap('map', async (lat, lng) => {
        userLocation = { lat, lng };
        await loadPosts();
    });

    // 3. View Router & Event Listeners
    setupEventListeners();
    handleInitialRoute();
});

function handleInitialRoute() {
    // Simple hash routing if needed, or default
    const hash = window.location.hash.replace('#', '');
    if (['view-map', 'view-adopt', 'view-vision', 'view-about'].includes(hash)) {
        switchView(hash);
    }
}

function switchView(targetId) {
    // Hide all sections
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));

    // Show target
    const target = document.getElementById(targetId);
    if (target) {
        target.classList.remove('hidden');
        currentView = targetId;
        window.location.hash = targetId;

        // Special handling
        if (targetId === 'view-map') {
            // Force map resize calc
            setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
        }
        if (targetId === 'view-adopt') {
            renderAdoptionGrid(allPostsData);
        }
    }

    // Update Nav State
    document.querySelectorAll('.nav-link').forEach(btn => {
        if (btn.dataset.target === targetId) {
            btn.classList.add('text-brand-600', 'bg-gray-50');
        } else {
            btn.classList.remove('text-brand-600', 'bg-gray-50');
        }
    });

    // Mobile menu close
    document.getElementById('mobile-menu').classList.add('hidden');
}

function updateAuthUI(user) {
    const authBtn = document.getElementById('nav-auth-btn');
    const profileBtn = document.getElementById('nav-profile-btn');
    const reportBtn = document.getElementById('fab-report');

    if (user) {
        authBtn.classList.add('hidden');
        profileBtn.classList.remove('hidden');
        // profileBtn.querySelector('span').textContent = user.displayName || 'User'; // removed span in new HTML
        reportBtn.classList.remove('hidden');

        updateElementText('profile-name', user.displayName || 'Guardian');
        updateElementText('profile-email', user.email);
        getUserData(user.uid).then(data => {
            if(data) updateElementText('profile-karma', `${data.karma} Karma`);
        });

    } else {
        authBtn.classList.remove('hidden');
        profileBtn.classList.add('hidden');
        reportBtn.classList.add('hidden');
    }
}

async function loadPosts() {
    try {
        const posts = await fetchNearbyPosts(userLocation.lat, userLocation.lng);
        allPostsData = posts; // Cache

        // Update whichever view is active
        if (currentView === 'view-map') {
            renderMarkers(posts);
        } else if (currentView === 'view-adopt') {
            renderAdoptionGrid(posts);
        }
    } catch (err) {
        console.error(err);
        showToast("Failed to load animals.", 'error');
    }
}

function setupEventListeners() {
    // Navigation (Desktop & Mobile)
    document.querySelectorAll('.nav-link').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(e.target.dataset.target);
        });
    });

    // Mobile Menu Toggle
    document.getElementById('mobile-menu-btn').addEventListener('click', () => {
        const menu = document.getElementById('mobile-menu');
        menu.classList.toggle('hidden');
    });

    // --- Map Filters ---
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('bg-brand-500', 'text-white'));
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.add('bg-white', 'text-gray-700'));

            e.target.classList.remove('bg-white', 'text-gray-700');
            e.target.classList.add('bg-brand-500', 'text-white');

            const filterType = e.target.dataset.filter;
            if (['Dog', 'Cat', 'Bird', 'All'].includes(filterType)) {
                applyFilters({ type: filterType });
            } else {
                applyFilters({ status: filterType });
            }
        });
    });

    // --- Adopt Page Filters ---
    document.querySelectorAll('.adopt-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.adopt-filter-btn').forEach(b => {
                b.classList.remove('bg-brand-600', 'text-white');
                b.classList.add('bg-white', 'text-gray-700');
            });
            e.target.classList.remove('bg-white', 'text-gray-700');
            e.target.classList.add('bg-brand-600', 'text-white');

            renderAdoptionGrid(allPostsData, e.target.dataset.filter);
        });
    });

    // Modals
    document.getElementById('nav-auth-btn').addEventListener('click', () => toggleModal('auth-modal', true));
    document.getElementById('nav-profile-btn').addEventListener('click', openProfile);
    document.getElementById('fab-report').addEventListener('click', startWizard);

    // Auth Actions
    document.getElementById('google-login-btn').addEventListener('click', loginWithGoogle);
    document.getElementById('toggle-auth').addEventListener('click', () => {
        const login = document.getElementById('login-form');
        const signup = document.getElementById('signup-form');
        if (login.classList.contains('hidden')) {
            login.classList.remove('hidden');
            signup.classList.add('hidden');
        } else {
            login.classList.add('hidden');
            signup.classList.remove('hidden');
        }
    });

    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = e.target.email.value;
        const password = e.target.password.value;
        loginWithEmail(email, password);
    });

    document.getElementById('signup-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = e.target.email.value;
        const password = e.target.password.value;
        signupWithEmail(email, password);
    });

    document.getElementById('logout-btn').addEventListener('click', async () => {
        await logout();
        toggleModal('profile-modal', false);
        window.location.reload();
    });

    // Wizard Logic
    setupWizard();

    // Close Modals
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.target.closest('.modal').id;
            toggleModal(modalId, false);
        });
    });
}

function setupWizard() {
    const wizardForm = document.getElementById('wizard-form');
    const wizardNextBtn = document.getElementById('wizard-next');
    const wizardBackBtn = document.getElementById('wizard-back');
    const wizardSubmitBtn = document.getElementById('wizard-submit');
    const steps = [
        document.getElementById('step-1'),
        document.getElementById('step-2'),
        document.getElementById('step-3')
    ];
    let currentStep = 0;

    function showStep(index) {
        steps.forEach((el, i) => el.classList.toggle('hidden', i !== index));
        wizardBackBtn.classList.toggle('hidden', index === 0);
        wizardNextBtn.classList.toggle('hidden', index === 2);
        wizardSubmitBtn.classList.toggle('hidden', index !== 2);

        if (index === 1 && !wizardMapInstance) {
            setTimeout(() => {
                const ref = initWizardMap('wizard-map', userLocation.lat, userLocation.lng);
                wizardMapInstance = ref;
            }, 100);
        }
    }

    wizardNextBtn.addEventListener('click', () => {
        if (currentStep === 0 && !document.getElementById('post-photo').files[0]) {
            showToast('Please select a photo', 'error');
            return;
        }
        if (currentStep < 2) {
            currentStep++;
            showStep(currentStep);
        }
    });

    wizardBackBtn.addEventListener('click', () => {
        if (currentStep > 0) {
            currentStep--;
            showStep(currentStep);
        }
    });

    wizardSubmitBtn.addEventListener('click', async (e) => {
        e.preventDefault(); // Ensure no form submit refresh
        const user = getCurrentUser();
        if (!user) return;

        try {
            wizardSubmitBtn.disabled = true;
            wizardSubmitBtn.textContent = "Uploading...";

            const file = document.getElementById('post-photo').files[0];
            const imageUrl = await compressAndUploadImage(file);
            const type = document.getElementById('post-type').value;
            const urgency = document.getElementById('post-urgency').value;
            const desc = document.getElementById('post-desc').value;
            const whatsapp = document.getElementById('post-whatsapp').value;
            const loc = wizardMapInstance.getLocation();

            await createPost({
                type,
                urgency,
                description: desc,
                whatsapp,
                imageUrl,
                location: { lat: loc.lat, lng: loc.lng } // Ensure simple object or GeoPoint as db expects
            }, user);

            showToast('Report Posted! +10 Karma', 'success');
            toggleModal('wizard-modal', false);
            wizardForm.reset();
            currentStep = 0;
            showStep(0);
            loadPosts();

        } catch (error) {
            console.error(error);
            showToast(error.message, 'error');
        } finally {
            wizardSubmitBtn.disabled = false;
            wizardSubmitBtn.textContent = "Submit";
        }
    });
}

async function openProfile() {
    toggleModal('profile-modal', true);
    const user = getCurrentUser();
    if (!user) return;

    const list = document.getElementById('my-rescues-list');
    list.innerHTML = '<div class="flex justify-center p-4"><div class="animate-spin h-6 w-6 border-2 border-brand-500 rounded-full border-t-transparent"></div></div>';

    const posts = await getUserPosts(user.uid);
    list.innerHTML = '';

    if (posts.length === 0) {
        list.innerHTML = '<p class="text-gray-400 text-center py-4">No rescues yet. Start your journey!</p>';
        return;
    }

    posts.forEach(post => {
        const item = document.createElement('div');
        item.className = "flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition";
        item.innerHTML = `
            <img src="${post.imageUrl}" class="w-14 h-14 rounded-lg object-cover bg-gray-200">
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-gray-800 text-sm truncate">${post.type}</h4>
                <div class="flex items-center gap-2 mt-1">
                    <span class="text-xs px-2 py-0.5 rounded-full font-medium ${post.status === 'adopted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${post.status}</span>
                    <span class="text-xs text-gray-400">${new Date(post.timestamp?.toDate ? post.timestamp.toDate() : post.timestamp).toLocaleDateString()}</span>
                </div>
            </div>
            ${post.status !== 'adopted' ? `<button class="text-xs bg-white border border-brand-200 text-brand-600 px-3 py-1.5 rounded-lg hover:bg-brand-50 font-medium mark-adopted-btn transition shadow-sm">Mark Adopted</button>` : ''}
        `;

        const btn = item.querySelector('.mark-adopted-btn');
        if (btn) {
            btn.addEventListener('click', async () => {
                if (confirm('Confirm adoption?')) {
                    await markAsAdopted(post.id);
                    openProfile();
                    loadPosts();
                    showToast('Status updated!', 'success');
                }
            });
        }

        list.appendChild(item);
    });
}

function startWizard() {
    toggleModal('wizard-modal', true);
}
