document.addEventListener('DOMContentLoaded', () => {
    let currentMode = 'shop'; // 'shop' or 'craft'

    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    // UI Elements
    const mainHeading = document.getElementById('mainHeading');
    const resultsContainer = document.getElementById('resultsContainer');
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('errorMessage');
    const resultsContent = document.getElementById('resultsContent');
    
    const whyNotBuySection = document.getElementById('whyNotBuySection');
    const whyNotBuyText = document.getElementById('whyNotBuyText');
    const whyNotTitle = document.getElementById('whyNotTitle');
    const resultsTitle = document.getElementById('resultsTitle');
    const alternativesGrid = document.getElementById('alternativesGrid');

    // New V3 Elements
    const modeShop = document.getElementById('modeShop');
    const modeCraft = document.getElementById('modeCraft');
    const imageUpload = document.getElementById('imageUpload');
    const uploadBtn = document.getElementById('uploadBtn');
    const locationModal = document.getElementById('locationModal');
    const sortWrapper = document.getElementById('sortWrapper');
    const sortSelect = document.getElementById('sortSelect');

    // Mode Toggling Logic
    modeShop.addEventListener('click', () => setMode('shop'));
    modeCraft.addEventListener('click', () => setMode('craft'));

    function setMode(mode) {
        currentMode = mode;
        if (mode === 'shop') {
            modeShop.classList.add('active');
            modeCraft.classList.remove('active');
            mainHeading.textContent = "Find a Sustainable Alternative";
            searchInput.placeholder = "Enter a product or leave blank to see all...";
            sortWrapper.classList.remove('hidden');
        } else {
            modeCraft.classList.add('active');
            modeShop.classList.remove('active');
            mainHeading.textContent = "Find DIY Upcycling Crafts";
            searchInput.placeholder = "Enter a material (e.g., paper) or leave blank...";
            sortWrapper.classList.add('hidden');
        }
        resultsContainer.classList.add('hidden');
    }

    // Trigger search on Enter key
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    searchBtn.addEventListener('click', performSearch);
    sortSelect.addEventListener('change', () => {
        if (!resultsContainer.classList.contains('hidden') && currentMode === 'shop') {
            performSearch();
        }
    });

    // Image Upload Handlers
    uploadBtn.addEventListener('click', () => {
        imageUpload.click();
    });

    imageUpload.addEventListener('change', async (e) => {
        if (!e.target.files.length) return;
        
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);
        
        showLoading();
        
        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            
            if (data.error) {
                showError(data.error);
                return;
            }
            
            // Populate the search input with the detected item and trigger search
            searchInput.value = data.detected_product;
            performSearch();
            
        } catch (err) {
            showError('Upload failed. Ensure backend is running.');
        }
    });

    function showLoading() {
        loading.classList.remove('hidden');
        errorMessage.classList.add('hidden');
        resultsContent.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
        alternativesGrid.innerHTML = '';
    }

    function showError(msg) {
        loading.classList.add('hidden');
        errorMessage.textContent = msg;
        errorMessage.classList.remove('hidden');
    }

    async function performSearch() {
        const query = searchInput.value.trim();

        showLoading();

        try {
            const endpoint = currentMode === 'shop' ? '/api/search' : '/api/crafts';
            // If empty, backend now defaults to "all"
            const url = query ? `${endpoint}?q=${encodeURIComponent(query)}` : endpoint;
            
            const response = await fetch(url);
            const data = await response.json();

            loading.classList.add('hidden');

            if (!response.ok) {
                showError(data.error || 'An error occurred');
                return;
            }

            if (currentMode === 'shop') {
                renderShopResults(data.results, query);
            } else {
                renderCraftResults(data.results, query);
            }
            resultsContent.classList.remove('hidden');
            
        } catch (err) {
            console.error('Fetch error:', err);
            showError('Failed to connect to the system. Is the backend running?');
        }
    }

    function renderShopResults(data, originalQuery) {
        let alternativesToRender = [];
        
        // Handle "Show All" or "Single Search" Modes
        if (data.is_all) {
            whyNotBuySection.classList.add('hidden');
            resultsTitle.textContent = "Browse All Sustainable Products";
            
            // Flatten all alternatives from all categories into one array
            for (const category in data.categories) {
                data.categories[category].alternatives.forEach(alt => {
                    alt._searchCat = category; // Pass Category for local maps search
                    alternativesToRender.push(alt);
                });
            }
        } else {
            if (data.why_not_buy) {
                whyNotTitle.textContent = "✋ Wait! Do you really need to buy this?";
                whyNotBuyText.textContent = data.why_not_buy;
                whyNotBuySection.classList.remove('hidden');
            } else {
                whyNotBuySection.classList.add('hidden');
            }
            resultsTitle.textContent = "Recommended Alternatives";
            
            data.alternatives.forEach(alt => {
                alt._searchCat = originalQuery;
                alternativesToRender.push(alt);
            });
        }
        
        // Sorting Logic
        const sortVal = sortSelect.value;
        if (sortVal === 'priceLow') {
            alternativesToRender.sort((a, b) => (a.base_price || 0) - (b.base_price || 0));
        } else if (sortVal === 'priceHigh') {
            alternativesToRender.sort((a, b) => (b.base_price || 0) - (a.base_price || 0));
        } else if (sortVal === 'ecoScore') {
            alternativesToRender.sort((a, b) => b.eco_score - a.eco_score);
        }

        // Render Alternatives
        alternativesToRender.forEach(alt => {
            const card = document.createElement('div');
            card.className = 'eco-card';

            const scoreDegree = (alt.eco_score / 100) * 360;

            // Generate Action Buttons dynamically
            let actionButtonsHtml = '<div class="action-buttons">';
            alt.availability.forEach(store => {
                if (store.type === 'local') {
                    // Pass the generic category name to Maps (e.g. "watch" instead of "Bamboo Minimalist Watch")
                    const safeName = alt._searchCat;
                    actionButtonsHtml += `<button class="store-btn local" onclick="findLocalStore('${store.store}', '${safeName}')">📍 Near Me</button>`;
                } else {
                    actionButtonsHtml += `<a href="${store.url}" target="_blank" class="store-btn">🛒 ${store.store}</a>`;
                }
            });
            actionButtonsHtml += '</div>';

            card.innerHTML = `
                <div class="card-header">
                    <img src="${alt.image}" alt="${alt.name}" class="product-image" onerror="this.src='https://picsum.photos/400/300'">
                    <h4>${alt.name}</h4>
                    <span class="type-tag">${alt.type}</span>
                </div>
                
                <p class="why-eco-text">${alt.why_eco}</p>

                <div class="eco-score-section">
                    <div class="score-circle" style="--score-deg: ${scoreDegree}deg">
                        ${alt.eco_score}
                    </div>
                    <div class="score-details">
                        <div class="score-line"><span>Material:</span> <span>${alt.eco_breakdown.Material}/30</span></div>
                        <div class="score-line"><span>Reusability:</span> <span>${alt.eco_breakdown.Reusability}/30</span></div>
                        <div class="score-line"><span>Lifespan:</span> <span>${alt.eco_breakdown.Lifespan}/20</span></div>
                        <div class="score-line"><span>Carbon Impact:</span> <span>${alt.eco_breakdown['Carbon Impact']}/20</span></div>
                    </div>
                </div>

                <div class="impact-report">
                    <h5>🌍 Real-World Impact</h5>
                    <ul class="impact-list">
                        <li>📉 <span>Plastic Saved:</span> <strong>${alt.impact.plastic_saved}</strong></li>
                        <li>💨 <span>CO₂ Reduction:</span> <strong>${alt.impact.co2_reduction}</strong></li>
                        <li>💰 <span>Money Saved:</span> <strong>${alt.impact.money_saved}</strong></li>
                    </ul>
                </div>
                
                ${actionButtonsHtml}
            `;
            alternativesGrid.appendChild(card);
        });
    }

    function renderCraftResults(data, query) {
        let craftsToRender = [];
        
        if (data.is_all) {
            whyNotBuySection.classList.add('hidden');
            resultsTitle.textContent = "Browse All DIY Upcycling Crafts";
            
            for (const category in data.categories) {
                data.categories[category].crafts.forEach(craft => craftsToRender.push(craft));
            }
        } else {
            whyNotTitle.textContent = "♻️ Eco-Friendly Crafting";
            whyNotBuyText.textContent = `Instead of throwing away ${data.material || query}, upcycle it into something beautiful!`;
            whyNotBuySection.classList.remove('hidden');
            resultsTitle.textContent = "Step-By-Step Craft Guides";
            
            data.crafts.forEach(craft => craftsToRender.push(craft));
        }

        craftsToRender.forEach(craft => {
            const card = document.createElement('div');
            card.className = 'eco-card';

            let stepsHtml = '<ol class="craft-step-list">';
            craft.steps.forEach(step => {
                stepsHtml += `<li>${step}</li>`;
            });
            stepsHtml += '</ol>';

            card.innerHTML = `
                <div class="card-header">
                    <img src="${craft.image}" alt="${craft.title}" class="product-image" onerror="this.src='https://picsum.photos/400/300'">
                    <h4>${craft.title}</h4>
                    <span class="type-tag" style="background:var(--accent); color:#000;">${craft.difficulty} • ${craft.time}</span>
                </div>
                
                <h5 style="margin: 1rem 0 0.5rem; color: var(--accent);">Instructions:</h5>
                ${stepsHtml}
            `;
            alternativesGrid.appendChild(card);
        });
    }

    // Global Function to handle "Local Stores" button
    window.findLocalStore = function(storeType, genericCategory) {
        locationModal.classList.remove('hidden');

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    // Mock delay for UI UX purpose
                    setTimeout(() => {
                        locationModal.classList.add('hidden');
                        const mapUrl = `https://www.google.com/maps/search/eco+friendly+${encodeURIComponent(genericCategory)}+near+${lat},${lon}`;
                        window.open(mapUrl, '_blank');
                    }, 1500);
                },
                (error) => {
                    console.error("Location error:", error);
                    alert("We couldn't get your location. Please ensure location services are enabled!");
                    locationModal.classList.add('hidden');
                }
            );
        } else {
            alert("Geolocation is not supported by your browser.");
            locationModal.classList.add('hidden');
        }
    }
});
