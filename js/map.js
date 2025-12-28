// Leaflet Map Logic
// Global map instance
let map;
let markers; // Cluster group
let userLocationMarker;
let userLoc = { lat: 0, lng: 0 };
let allPostsCache = [];

export function initMap(elementId, onLocationFound) {
    map = L.map(elementId).setView([0, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Initialize Marker Cluster
    markers = L.markerClusterGroup();
    map.addLayer(markers);

    // Locate User
    map.locate({ setView: true, maxZoom: 13 });

    map.on('locationfound', (e) => {
        userLoc = e.latlng;
        // User marker
        L.circleMarker(e.latlng, {
            radius: 8,
            fillColor: "#3B82F6",
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(map).bindPopup("You are here");

        if (onLocationFound) onLocationFound(e.latlng.lat, e.latlng.lng);
    });

    map.on('locationerror', (e) => {
        console.warn("Location access denied", e);
        // Default to a known location (e.g. London) if failed
        map.setView([51.505, -0.09], 13);
        if (onLocationFound) onLocationFound(51.505, -0.09);
    });
}

export function renderMarkers(posts, onMarkerClick) {
    allPostsCache = posts;
    applyFilters({}); // Render all initially
}

export function applyFilters(filters) {
    // filters: { type: 'Dog'|'Cat'|'All', status: 'critical'|'adopted'|'all' }
    markers.clearLayers();

    allPostsCache.forEach(post => {
        // Filter Logic
        if (filters.type && filters.type !== 'All' && post.type !== filters.type) return;
        if (filters.status && filters.status !== 'All') {
             // Logic for status mapping if needed. Post has 'status' (stray/adopted) and 'urgency'.
             // Simplification: if filter is 'adopted', match post.status == 'adopted'.
             // if filter is 'critical', match post.urgency == 'critical'.
             if (filters.status === 'Adopted' && post.status !== 'adopted') return;
             if (filters.status === 'Critical' && post.urgency !== 'critical') return;
             if (filters.status === 'Stray' && post.status === 'adopted') return;
        }

        const iconColor = post.status === 'adopted' ? 'green' : (post.urgency === 'critical' ? 'red' : 'orange');

        // Custom simple marker using DivIcon for Tailwind integration or simple color
        // Using standard leaflet icons with hue rotate or custom URL is standard.
        // For 'Pro' feel, let's use a custom HTML marker
        const customIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color:${iconColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });

        const marker = L.marker([post.location.lat, post.location.lng], { icon: customIcon });

        // Popup Content
        const popupContent = `
            <div class="p-2 w-48 font-sans">
                <div class="relative w-full h-32 mb-2 rounded overflow-hidden bg-gray-100">
                    <img src="${post.imageUrl}" class="w-full h-full object-cover">
                    ${post.status === 'adopted' ? '<span class="absolute top-0 right-0 bg-green-500 text-white text-xs px-1 font-bold">ADOPTED</span>' : ''}
                </div>
                <h3 class="font-bold text-lg text-gray-800">${post.type}</h3>
                <p class="text-sm text-gray-600 truncate">${post.description}</p>
                <div class="mt-2 flex gap-2">
                    <a href="https://wa.me/${post.whatsapp}" target="_blank" class="flex-1 bg-green-500 text-white text-center text-sm py-1 rounded hover:bg-green-600 transition">Chat</a>
                    <button class="view-details-btn flex-1 bg-blue-500 text-white text-sm py-1 rounded hover:bg-blue-600 transition" data-id="${post.id}">Details</button>
                </div>
            </div>
        `;

        marker.bindPopup(popupContent);
        marker.on('popupopen', () => {
             // Bind click event for 'Details' button inside popup
             const btn = document.querySelector(`.view-details-btn[data-id="${post.id}"]`);
             if (btn) btn.addEventListener('click', () => {
                 // Trigger global event or callback
                 const event = new CustomEvent('view-post-details', { detail: post });
                 window.dispatchEvent(event);
             });
        });

        markers.addLayer(marker);
    });
}

// Draggable Pin for Wizard
let wizardMarker;
export function initWizardMap(elementId, initialLat, initialLng) {
    const wMap = L.map(elementId).setView([initialLat, initialLng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(wMap);

    wizardMarker = L.marker([initialLat, initialLng], { draggable: true }).addTo(wMap);

    return {
        map: wMap,
        marker: wizardMarker,
        getLocation: () => wizardMarker.getLatLng()
    };
}
