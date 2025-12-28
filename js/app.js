import { initAuth, getCurrentUser, loginWithGoogle, loginWithEmail, signupWithEmail, logout, getUserData } from './auth.js';
import { initMap, renderMarkers, applyFilters, initWizardMap } from './map.js';
import { fetchNearbyPosts, createPost, compressAndUploadImage, markAsAdopted, getUserPosts } from './db.js';
import { showToast, toggleModal, updateElementText } from './ui.js';

// Global State
let userLocation = { lat: 0, lng: 0 };
let wizardMapInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Init Auth
    initAuth(async (user) => {
        updateAuthUI(user);
        if (user) {
            // Load Profile Data if on profile view
            // For now, simpler SPA routing is handled by showing/hiding views
        }
    });

    // 2. Init Map
    initMap('map', async (lat, lng) => {
        userLocation = { lat, lng };
        loadPosts();
    });

    // 3. Event Listeners
    setupEventListeners();
});

function updateAuthUI(user) {
    const authBtn = document.getElementById('nav-auth-btn');
    const profileBtn = document.getElementById('nav-profile-btn');
    const reportBtn = document.getElementById('fab-report');

    if (user) {
        authBtn.classList.add('hidden');
        profileBtn.classList.remove('hidden');
        profileBtn.querySelector('span').textContent = user.displayName || 'User';
        reportBtn.classList.remove('hidden'); // Only logged in can post

        // Update Profile View data
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
        renderMarkers(posts);
    } catch (err) {
        console.error(err);
        showToast("Failed to load nearby animals.", 'error');
    }
}

function setupEventListeners() {
    // Nav
    document.getElementById('nav-auth-btn').addEventListener('click', () => toggleModal('auth-modal', true));
    document.getElementById('nav-profile-btn').addEventListener('click', openProfile);
    document.getElementById('fab-report').addEventListener('click', startWizard);

    // Filter Bar
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            // Toggle active class
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('bg-green-600', 'text-white'));
            e.target.classList.add('bg-green-600', 'text-white');

            const filterType = e.target.dataset.filter;
            // Simplified filter logic: Assuming simple exclusivity for demo
            if (['Dog', 'Cat', 'Bird', 'All'].includes(filterType)) {
                applyFilters({ type: filterType });
            } else {
                applyFilters({ status: filterType });
            }
        });
    });

    // Auth Forms
    document.getElementById('google-login-btn').addEventListener('click', loginWithGoogle);

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
    });

    // Wizard Flow
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

        // Init wizard map if step 2
        if (index === 1 && !wizardMapInstance) {
            setTimeout(() => { // delay for layout render
                const ref = initWizardMap('wizard-map', userLocation.lat, userLocation.lng);
                wizardMapInstance = ref;
            }, 100);
        }
    }

    wizardNextBtn.addEventListener('click', () => {
        // Validation for Step 1
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

    wizardSubmitBtn.addEventListener('click', async () => {
        const user = getCurrentUser();
        if (!user) return;

        try {
            wizardSubmitBtn.disabled = true;
            wizardSubmitBtn.textContent = "Uploading...";

            // 1. Upload Image
            const file = document.getElementById('post-photo').files[0];
            const imageUrl = await compressAndUploadImage(file);

            // 2. Get Data
            const type = document.getElementById('post-type').value;
            const urgency = document.getElementById('post-urgency').value;
            const desc = document.getElementById('post-desc').value;
            const whatsapp = document.getElementById('post-whatsapp').value;
            const loc = wizardMapInstance.getLocation();

            // 3. Create Post
            await createPost({
                type,
                urgency, // 'critical', 'need-food', 'adoption-ready'
                description: desc,
                whatsapp,
                imageUrl,
                location: new GeoPoint(loc.lat, loc.lng)
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
            wizardSubmitBtn.textContent = "Submit Report";
        }
    });

    // Close Modals
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.target.closest('.modal').id;
            toggleModal(modalId, false);
        });
    });

    // Listen for custom 'view-post-details' event
    window.addEventListener('view-post-details', (e) => {
        // Here we could open a detailed modal. For MVP Pro, the popup is often enough,
        // but let's show how we'd handle it.
        console.log("Details requested for", e.detail);
        // Maybe open a chat or detailed view.
    });
}

async function openProfile() {
    toggleModal('profile-modal', true);
    const user = getCurrentUser();
    if (!user) return;

    const list = document.getElementById('my-rescues-list');
    list.innerHTML = '<p class="text-gray-500">Loading...</p>';

    const posts = await getUserPosts(user.uid);
    list.innerHTML = '';

    if (posts.length === 0) {
        list.innerHTML = '<p class="text-gray-500">No rescues yet.</p>';
        return;
    }

    posts.forEach(post => {
        const item = document.createElement('div');
        item.className = "flex items-center gap-3 p-2 bg-gray-50 rounded mb-2";
        item.innerHTML = `
            <img src="${post.imageUrl}" class="w-12 h-12 rounded object-cover">
            <div class="flex-1">
                <h4 class="font-bold text-sm">${post.type}</h4>
                <span class="text-xs px-2 py-0.5 rounded ${post.status === 'adopted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${post.status}</span>
            </div>
            ${post.status !== 'adopted' ? `<button class="text-xs bg-green-500 text-white px-2 py-1 rounded mark-adopted-btn">Mark Adopted</button>` : ''}
        `;

        const btn = item.querySelector('.mark-adopted-btn');
        if (btn) {
            btn.addEventListener('click', async () => {
                if (confirm('Confirm adoption?')) {
                    await markAsAdopted(post.id);
                    openProfile(); // Refresh
                    loadPosts(); // Refresh Map
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
