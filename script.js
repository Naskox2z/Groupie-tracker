let artists = [];
let favs = JSON.parse(localStorage.getItem('hp_favs') || '[]');
let currentDetail = null;

const LS_KEYS = {
    FAVS: 'hp_favs',
    REQUESTS: 'hp_requests'
};

function loadFavs() {
    return JSON.parse(localStorage.getItem(LS_KEYS.FAVS) || '[]');
}
function saveFavs(favs) {
    localStorage.setItem(LS_KEYS.FAVS, JSON.stringify(favs));
}

function loadRequests() {
    return JSON.parse(localStorage.getItem(LS_KEYS.REQUESTS) || '[]');
}
function saveRequests(reqs) {
    localStorage.setItem(LS_KEYS.REQUESTS, JSON.stringify(reqs));
}

async function fetchArtists() {
    try {
        const res = await fetch('/api/artists');
        if (!res.ok) {
            throw new Error('Erreur serveur : ' + res.status);
        }

        const data = await res.json();
        return data;

    } catch (err) {
        console.error('Impossible de charger les artistes depuis le serveur :', err);
        return [];
    }
}

async function fetchArtistDetail(id) {
    try {
        const res = await fetch(`/api/artist/${id}`);
        if (!res.ok) throw new Error('Erreur ' + res.status);
        return await res.json();
    } catch (err) {
        console.error('Impossible de charger le détail :', err);
        return null;
    }
}

const artistsGrid   = document.getElementById('artists');
const searchBar     = document.getElementById('searchBar');
const favCount      = document.getElementById('favCount');
const genreBtns     = document.querySelectorAll('.genre-btn');
const openRequest   = document.getElementById('openRequest');
const requestModal  = document.getElementById('requestModal');
const closeRequest  = document.getElementById('closeRequest');
const artistRequestForm = document.getElementById('artistRequestForm');
const favLink       = document.getElementById('favoritesLink');
const adminLink     = document.getElementById('adminLink');
const adminPanel    = document.getElementById('adminPanel');
const requestsList  = document.getElementById('requestsList');
const artistsAdmin  = document.getElementById('artistsAdmin');
const closeAdmin    = document.getElementById('closeAdmin');
const detailModal  = document.getElementById('detailModal');
const closeDetail  = document.getElementById('closeDetail');
const detailImg    = document.getElementById('detail-img');
const detailName   = document.getElementById('detail-name');
const detailSub    = document.getElementById('detail-sub');
const detailBody   = document.getElementById('detail-body');
const tabBtns      = document.querySelectorAll('.tab-btn');
const filterBtns = document.querySelectorAll('.genre-btn');

function updateFavCount() {
    favCount.textContent = loadFavs().length;
}

function createCardHTML(artist) {
    const isFav = favs.includes(String(artist.id));
    const nb = artist.members.length;
    let badge = '';
    if      (nb === 1) badge = 'Solo';
    else if (nb === 2) badge = 'Duo';
    else if (nb === 3) badge = 'Trio';
    else               badge = 'Quatuor ou +'
    return `
     <article class="card" data-id="${artist.id}" style="cursor:pointer">
        <div class="badge">${badge}</div>

        <img
            src="${artist.image}"
            alt="${artist.name}"
            onerror="this.onerror=null;this.src='https://via.placeholder.com/150';"
            onclick="openDetail(${artist.id})"
            style="cursor:pointer"
        />
        <h3 onclick="openDetail(${artist.id})" style="cursor:pointer">${artist.name}</h3>
 
        <p style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px">
            Depuis ${artist.creationDate} · ${nb} membre(s)
        </p>
        <p style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:2px">
            1er album : ${artist.firstAlbum}
        </p>
 
        <div class="card-actions">
            <!-- Le bouton favori : stopPropagation évite d'ouvrir le modal quand on clique sur l'étoile -->
            <button class="fav-btn ${isFav ? 'active' : ''}" data-id="${artist.id}"
                onclick="event.stopPropagation()">
                ${isFav ? '★' : '☆'}
            </button>
            <!-- Bouton "En savoir plus" → ouvre le modal détail -->
            <button class="listen-btn" onclick="openDetail(${artist.id})">En savoir +</button>
        </div>
    </article>
    `;
}

function renderArtists({ filter = 'all', query = '', showFavsOnly = false } = {}) {
    
    let data = artists.slice();
    const q = query.trim().toLowerCase();

    if (filter !== 'all') {
        switch(filter) {  
            case "solo":   data = data.filter(a => a.members.length === 1); break;
            case "duo":    data = data.filter(a => a.members.length === 2); break;
            case "trio":   data = data.filter(a => a.members.length === 3); break;
            case "groupe": data = data.filter(a => a.members.length >= 4);  break;
        }
    }

    if (q) {
        data = data.filter(a => (a.name || '').toLowerCase().includes(q));
    }

    if (showFavsOnly) {
        data = data.filter(a => favs.includes(String(a.id)));
    }

    if (data.length === 0) {
        artistsGrid.innerHTML = `<p style="color:rgba(255,255,255,0.7);padding:30px;text-align:center">Aucun artiste trouvé.</p>`;
        return;
    }

    artistsGrid.innerHTML = data.map(createCardHTML).join('');

    document.querySelectorAll('.fav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            toggleFav(id);
            btn.classList.toggle('active');
            btn.textContent = favs.includes(String(id)) ? '★' : '☆';
            updateFavCount();
        });
    });
}
async function openDetail(id) {
    detailModal.classList.remove('hidden');
    detailName.textContent = 'chargement...';
    detailSub.textContent = '';
    detailBody.innerHTML = '<p style="padding:20px;color:rgba(255,255,255,0.6)">⏳ Récupération des données...</p>';
    tabBtns.forEach(b => b.classList.remove('active'));
    tabBtns[0].classList.add('active');

    const data = await fetchArtistDetail(id);

    if (!data) {
        detailBody.innerHTML = '<p style="padding:20px;color:#ff6b6b">Erreur lors du chargement.</p>';
        return;
    }
    currentDetail = data;

    detailImg.src          = data.Artist.image;
    detailName.textContent = data.Artist.name;
    detailSub.textContent  = `${data.Artist.members.length} membre(s) · Depuis ${data.Artist.creationDate}`;

    renderTab('all');
}
63

function renderTab(tabName) {
    if (!currentDetail) return;

    const a = currentDetail.Artist;
    const r = currentDetail.Relation;
    const concertEntries = Object.entries(r.datesLocations || {}).sort((a, b) => {
        const dateA = a[1][0]
        const dateB = b[1][0]
        const toISO = (d) => d.split('-').reverse().join('-');
        return tiIOS(dateA) > toISO(dateB) ? 1 : -1;
    });

    if (tabName === 'all') {
        detailBody.innerHTML = `
            <div class="tab-content">
                <div class="info-grid">
                    <div class="info-card">
                        <span class="info-label">👥 Membres</span>
                        <ul>${a.members.map(m => `<li>${m}</li>`).join('')}</ul>
                    </div>
                    <div class="info-card">
                        <span class="info-label">📅 Création</span>
                        <span class="info-value">${a.creationDate}</span>
                    </div>
                    <div class="info-card">
                        <span class="info-label">💿 1er album</span>
                        <span class="info-value">${a.firstAlbum}</span>
                    </div>
                    <div class="info-card">
                        <span class="info-label">🎤 Concerts</span>
                        <span class="info-value">${concertEntries.length} villes</span>
                    </div>
                </div>
                <h4 style="margin:16px 0 8px">Prochains concerts :</h4>
                <div class="concert-list">
                    ${concertEntries.slice(0, 4).map(([lieu, dates]) => `
                        <div class="concert-item">
                            <span class="concert-lieu">${formatLieu(lieu)}</span>
                            <span class="concert-date">${dates.join(', ')}</span>
                        </div>
                    `).join('')}
                    ${concertEntries.length > 4 ? `<p style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:8px">+${concertEntries.length - 4} autres → onglet Dates</p>` : ''}
                </div>
            </div>
        `;
 
    } else if (tabName === 'artist') {
        detailBody.innerHTML = `
            <div class="tab-content">
                <h4 style="margin-bottom:12px">Membres</h4>
                <div class="members-list">
                    ${a.members.map((m, i) => `
                        <div class="member-item">
                            <div class="member-avatar">${m[0]}</div>
                            <span>${m}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="info-grid" style="margin-top:16px">
                    <div class="info-card">
                        <span class="info-label">🗓️ Année de création</span>
                        <span class="info-value">${a.creationDate}</span>
                    </div>
                    <div class="info-card">
                        <span class="info-label">💿 Premier album</span>
                        <span class="info-value">${a.firstAlbum}</span>
                    </div>
                    <div class="info-card">
                        <span class="info-label">👥 Taille</span>
                        <span class="info-value">${getBadge(a.members.length)}</span>
                    </div>
                    <div class="info-card">
                        <span class="info-label">🌍 Pays visités</span>
                        <span class="info-value">${concertEntries.length} villes</span>
                    </div>
                </div>
            </div>
        `;
 
    } else if (tabName === 'dates') {
        detailBody.innerHTML = `
            <div class="tab-content">
                <h4 style="margin-bottom:12px">Toutes les dates de concerts</h4>
                ${concertEntries.length === 0
                    ? '<p style="color:rgba(255,255,255,0.5)">Aucune date disponible.</p>'
                    : `<div class="concert-list">
                        ${concertEntries.map(([lieu, dates]) => `
                            <div class="concert-item">
                                <span class="concert-lieu">${formatLieu(lieu)}</span>
                                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
                                    ${dates.map(d => `
                                        <span class="date-badge">${d}</span>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>`
                }
            </div>
        `;
 
    } else if (tabName === 'locations') {
        const pays = {};
        concertEntries.forEach(([lieu, dates]) => {
            const parts = lieu.split('-');
            const country = parts[parts.length - 1].replace(/_/g, ' ');
            const city    = parts.slice(0, -1).join(' ').replace(/_/g, ' ');
            if (!pays[country]) pays[country] = [];
            pays[country].push({ city, dates });
        });
 
        detailBody.innerHTML = `
            <div class="tab-content">
                <h4 style="margin-bottom:12px">Lieux de concerts (${Object.keys(pays).length} pays)</h4>
                <div class="locations-list">
                    ${Object.entries(pays).map(([country, villes]) => `
                        <div class="country-block">
                            <div class="country-header">🌍 ${capitalise(country)}</div>
                            ${villes.map(v => `
                                <div class="concert-item" style="padding-left:16px">
                                    <span class="concert-lieu">📍 ${capitalise(v.city)}</span>
                                    <span class="concert-date">${v.dates.join(', ')}</span>
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
}

function formatLieu(lieu) {
    const parts = lieu.split('-');
    const pays  = capitalise(parts[parts.length - 1].replace(/_/g, ' '));
    const ville = capitalise(parts.slice(0, -1).join(' ').replace(/_/g, ' '));
    return `${ville}, ${pays}`;
}
 

function capitalise(str) {
    return str.replace(/\b\w/g, l => l.toUpperCase());
}
 

function getBadge(nb) {
    if (nb === 1) return 'Solo';
    if (nb === 2) return 'Duo';
    if (nb === 3) return 'Trio';
    return `Groupe (${nb})`;
}
 

closeDetail.addEventListener('click', () => {
    detailModal.classList.add('hidden');
    currentDetail = null;
});
 

detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) {
        detailModal.classList.add('hidden');
        currentDetail = null;
    }
});
 
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderTab(btn.dataset.tab); // affiche le bon contenu
    });
});
searchBar.addEventListener('keyup', (e) => {
    const activeFilter = document.querySelector('.genre-btn.active')?.dataset.filter || 'all';
    renderArtists({ filter: activeFilter, query: e.target.value});
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderArtists({ filter: btn.dataset.filter, query: searchBar.value });
    });
});

favLink.addEventListener('click', (e) => {
    e.preventDefault();
    filterBtns.forEach(b => b.classList.remove('active'));
    renderArtists({filter: 'all', query:'', showFavsOnly: true});
});

function toggleFav(id) {
    favs = loadFavs();
    const sid = String(id);
    if (favs.includes(String(id))) {
        favs = favs.filter(x => x !== sid);
    } else {
        favs.push(sid);
    }
    saveFavs(favs);
}

openRequest.addEventListener('click', () => {
    requestModal.classList.remove('hidden');
});
closeRequest.addEventListener('click', () => {
    requestModal.classList.add('hidden');
});

artistRequestForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name  = document.getElementById('rq-name').value.trim();
    const link  = document.getElementById('rq-link').value.trim();
    const img   = document.getElementById('rq-img').value.trim();
    const genre = document.getElementById('rq-genre').value;
    const note  = document.getElementById('rq-note').value.trim();

    if (!name || !link) { alert('Nom et lien requis'); return; }

    const requests = loadRequests();
    requests.push({
        id:      'rq-' + Date.now(),
        name,
        link,
        genre,
        note,
        img,
        created: Date.now()
    });
    saveRequests(requests);

    artistRequestForm.reset();
    requestModal.classList.add('hidden');
    alert("Demande envoyée ! Elle apparaîtra dans l'admin pour validation.");
});


function showAdmin() {
    const pwd = prompt('Code admin (laisser vide pour accéder) :');
    if (pwd === null) return;
    adminPanel.classList.remove('hidden');
    renderAdmin();
}

adminLink.addEventListener('click', (e) => {
    e.preventDefault();
    showAdmin();
});

closeAdmin.addEventListener('click', () => {
    adminPanel.classList.add('hidden');
});

function renderAdmin() {
    const requests = loadRequests();

    if (requests.length === 0) {
        requestsList.innerHTML = '<p>Aucune demande.</p>';
    } else {
        requestsList.innerHTML = requests.map(r => `
            <div class="request" data-id="${r.id}">
                <div>
                    <strong>${r.name}</strong>
                    <div style="font-size:12px;color:rgba(255,255,255,0.7)">${r.genre} — ${new Date(r.created).toLocaleString()}</div>
                    <div style="font-size:13px;margin-top:6px">${r.note || ''}</div>
                    <div style="margin-top:8px"><a href="${r.link}" target="_blank">${r.link}</a></div>
                </div>
                <div style="display:flex;flex-direction:column;gap:6px">
                    <button class="accept-btn" data-id="${r.id}">Accepter</button>
                    <button class="reject-btn" data-id="${r.id}">Refuser</button>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.accept-btn').forEach(b => b.addEventListener('click', e => acceptRequest(e.target.dataset.id)));
        document.querySelectorAll('.reject-btn').forEach(b => b.addEventListener('click', e => rejectRequest(e.target.dataset.id)));
    }

    artistsAdmin.innerHTML = artists.map(a => `
        <div class="admin-artist">
            <img src="${a.image}">
                
            <div class="admin-artist-main">
                <strong>${a.name}</strong>
                <div>
                    Depuis ${a.creationDate} · ${a.members.length} membre(s)
                </div>
            </div>
        </div>

        ${a.custom ? `
            <button class="edit-artist-btn" data-id="${a.id}">Modifier</button>
            <button class="delete-artist-btn" data-id="${a.id}">Supprimer</button>
        ` : ''}
    </div>
`).join('');
document.querySelectorAll('.delete-artist-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteCustomArtist(btn.dataset.id));
});
}

// Accepter une demande :
function acceptRequest(reqId) {
    let requests = loadRequests();
    const req = requests.find(r => r.id === reqId);
    if (!req) return alert('Demande introuvable');

    // On crée un artiste dans le format de l'API de 01
    const newArtist = {
        id:           'custom-' + Date.now(),
        custom: true,
        name:         req.name,
        image:        req.img || 'https://via.placeholder.com/150',
        creationDate: req.creationDate || 'N/A',
        firstAlbum:  req.firstAlbum || 'N/A',
        members:      req.members || [],
        relationData: req.relationData || {},
        link:         req.link 
    };
    const customArtists = JSON.parse(localStorage.getItem('hp_custom_artists') || '[]');
    customArtists.push(newArtist);
    localStorage.setItem('hp_custom_artists', JSON.stringify(customArtists))
    artists.push(newArtist);
    requests = requests.filter(r => r.id !== reqId);
    saveRequests(requests);
    renderAdmin();
    renderArtists({ query: searchBar.value });
    alert(`${req.name} ajouté(e) !`);
}

function deleteCustomArtist(id) {
    let customArtists = JSON.parse(localStorage.getItem('hp_custom_artists') || '[]');

    customArtists = customArtists.filter(a => a.id !== id);
    // On enlève l'artiste du localStorage.

    localStorage.setItem('hp_custom_artists', JSON.stringify(customArtists));

    artists = artists.filter(a => a.id !== id);
    // On l'enlève aussi de la liste affichée actuellement.

    renderAdmin();
    renderArtists({ query: searchBar.value });
}

function rejectRequest(reqId) {
    let requests = loadRequests();
    requests = requests.filter(r => r.id !== reqId);
    saveRequests(requests);
    renderAdmin();
}

const fx = document.getElementById("effects");

function clearFX() {
    fx.innerHTML = '';
}

function applyTheme(theme) {
    clearFX();
    document.body.className = '';
    if (theme !== 'default') {
        document.body.classList.add(`theme-${theme}`);
    }
}

document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        applyTheme(btn.dataset.theme);
    });
});
genreBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.dataset.filter;
        clearFX();

        switch (type) {
            case "trio":
                document.body.style.background = 'linear-gradient(90deg, rgb(1,1,86), rgb(43,0,255), rgb(0,129,249), rgb(0,191,255))';
                document.body.style.backgroundSize = '400% 400%';
                document.body.style.animation = 'rapBreath 2.5s ease-in-out infinite';
                for (let i = 0; i < 10; i++) {
                    let s = document.createElement("div");
                    s.className = "smoke";
                    s.style.left = Math.random() * window.innerWidth + "px";
                    s.style.top  = Math.random() * window.innerHeight + "px";
                    fx.appendChild(s);
                }
                break;

            case "solo":
                document.body.style.background = 'linear-gradient(135deg,#ff00ff,#00e1ff,#ff006a)';
                document.body.style.backgroundSize = '400% 400%'
                document.body.style.animation = 'hyperpopGradient 3s ease forwards';
                for (let i = 0; i < 20; i++) {
                    let b = document.createElement("div");
                    b.className = "bubble";
                    b.style.left = Math.random() * window.innerWidth + "px";
                    b.style.bottom = "-50px";
                    let size = 20 + Math.random() * 40 + "px";
                    b.style.width = b.style.height = size;
                    fx.appendChild(b);
                }
                for (let i = 0; i < 15; i++) {
                    let s = document.createElement("div");
                    s.className = "star";
                    s.innerHTML = "✦";
                    s.style.left = Math.random() * window.innerWidth + "px";
                    s.style.top  = Math.random() * window.innerHeight + "px";
                    fx.appendChild(s);
                }
                break;

            case "duo":
                document.body.style.background = 'linear-gradient(135deg,#001aff,#00ffbf,#007bff)';
                document.body.style.backgroundSize = '400% 400%';
                document.body.style.animation = 'electroGradient 4s linear infinite';
                for (let i = 0; i < 20; i++) {
                    let l = document.createElement("div");
                    l.className = "neon-line";
                    l.style.left = Math.random() * window.innerWidth + "px";
                    l.style.top  = Math.random() * window.innerHeight + "px";
                    fx.appendChild(l);
                }
                break;

            case "groupe":
                document.body.style.background = 'linear-gradient(135deg,#fface4,#ffd8f0,#ffd27a)';
                document.body.style.backgroundSize = '400% 400%'
                document.body.style.animation = 'popGradient 5s ease infinite';
                for (let i = 0; i < 30; i++) {
                    let sp = document.createElement("div");
                    sp.className = "sparkle";
                    sp.style.left = Math.random() * window.innerWidth + "px";
                    sp.style.top  = Math.random() * window.innerHeight + "px";
                    fx.appendChild(sp);
                }
                break;

            default:
                document.body.style.background = '';
                document.body.style.backgroundSize = '';
                document.body.style.animation  = '';
        }
    });
});

async function init() {

    artists = await fetchArtists();
    const customArtists = JSON.parse('hp_custom_artists', JSON.stringify(customArtists));
    artists = [...artists, ...customArtists];
    favs = loadFavs();
    updateFavCount();
    renderArtists({ filter: 'all', query: '' });
    if (location.hash === '#admin') showAdmin();
}

init();