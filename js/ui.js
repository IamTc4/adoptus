// --- UI Utilities ---

export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');

    const baseClasses = "flex items-center w-full max-w-xs p-4 mb-4 text-gray-500 bg-white rounded-lg shadow dark:text-gray-400 dark:bg-gray-800 transition-opacity duration-300 ease-in-out opacity-0 translate-y-2 transform";

    let icon = '';
    if (type === 'success') {
        icon = `<div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-green-500 bg-green-100 rounded-lg dark:bg-green-800 dark:text-green-200">
                    <svg aria-hidden="true" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                </div>`;
    } else if (type === 'error') {
        icon = `<div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-red-500 bg-red-100 rounded-lg dark:bg-red-800 dark:text-red-200">
                    <svg aria-hidden="true" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                </div>`;
    } else {
        icon = `<div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-blue-500 bg-blue-100 rounded-lg dark:bg-blue-800 dark:text-blue-200">
                    <svg aria-hidden="true" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V5a1 1 0 00-1-1z"></path></svg>
                </div>`;
    }

    toast.className = baseClasses;
    toast.innerHTML = `
        ${icon}
        <div class="ml-3 text-sm font-normal">${message}</div>
        <button type="button" class="ml-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex h-8 w-8 dark:text-gray-500 dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700" aria-label="Close">
            <span class="sr-only">Close</span>
            <svg aria-hidden="true" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
        </button>
    `;

    toast.querySelector('button').addEventListener('click', () => {
        toast.remove();
    });

    container.appendChild(toast);
    requestAnimationFrame(() => {
        toast.classList.remove('opacity-0', 'translate-y-2');
    });

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

export function toggleModal(modalId, show = true) {
    const modal = document.getElementById(modalId);
    if (show) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    } else {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

export function updateElementText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

// --- NEW: Adoption Grid Rendering ---

export function renderAdoptionGrid(posts, filterType = 'All') {
    const grid = document.getElementById('adopt-grid');
    grid.innerHTML = ''; // Clear current

    const filtered = posts.filter(post => {
        if (filterType === 'All') return true;
        if (filterType === 'adoption-ready') return post.urgency === 'adoption-ready' || post.status === 'adoption-ready';
        return post.type === filterType;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="text-6xl mb-4">🐾</div>
                <h3 class="text-xl font-bold text-gray-400">No friends found matching filters.</h3>
                <p class="text-gray-400">Try changing your criteria.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(post => {
        const card = document.createElement('div');
        card.className = "bg-white rounded-2xl shadow-sm hover:shadow-md transition overflow-hidden border border-gray-100 flex flex-col";

        const badgeColor = post.status === 'adopted' ? 'bg-green-100 text-green-800' : (post.urgency === 'critical' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800');
        const badgeText = post.status === 'adopted' ? 'Adopted' : (post.urgency === 'critical' ? 'Critical' : 'Ready to Adopt');

        card.innerHTML = `
            <div class="relative h-56 bg-gray-100">
                <img src="${post.imageUrl}" class="w-full h-full object-cover" loading="lazy">
                <div class="absolute top-3 right-3 ${badgeColor} text-xs font-bold px-3 py-1 rounded-full shadow-sm uppercase tracking-wide">
                    ${badgeText}
                </div>
            </div>
            <div class="p-5 flex-1 flex flex-col">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-xl font-bold text-gray-900">${post.type}</h3>
                    <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">${new Date(post.timestamp?.toDate ? post.timestamp.toDate() : post.timestamp).toLocaleDateString()}</span>
                </div>
                <p class="text-gray-600 text-sm line-clamp-3 mb-4 flex-1">${post.description}</p>
                <div class="mt-auto pt-4 border-t border-gray-50">
                    <a href="https://wa.me/${post.whatsapp}" target="_blank" class="block w-full text-center bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2 rounded-lg transition shadow shadow-brand-200">
                        Chat on WhatsApp
                    </a>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}
