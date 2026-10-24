// Stato Globale dell'applicazione
let state = {
    favorites: JSON.parse(localStorage.getItem('lot_favorites') || '[]'),
    cachedLessons: {}, // Cache per salvare le lezioni scaricate ed evitare richieste duplicate
    allLoadedLessons: []
};

// Avvio dell'App
window.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    renderYearsGrid();
    updateFavBadge();
    await loadLatestLessons();
}

// 1. Genera la griglia degli Anni (1969 - 2002)
function renderYearsGrid() {
    const container = document.getElementById('years-grid');
    let html = '';

    for (let year = 1969; year <= 2002; year++) {
        html += `
            <button 
                onclick="loadYearLessons(${year})"
                class="h-14 sm:h-16 rounded-2xl flex flex-col items-center justify-center transition-all transform active:scale-95 border cursor-pointer bg-white hover:bg-amber-50 text-stone-700 border-sand-200"
                id="year-btn-${year}"
            >
                <span class="text-sm sm:text-base font-bold font-mono">${year}</span>
                <span class="text-[10px] opacity-75 font-medium text-amber-800" id="year-count-${year}">...</span>
            </button>
        `;
    }

    container.innerHTML = html;
}

// 2. Carica il file ultime.json per la Home Page
async function loadLatestLessons() {
    try {
        const response = await fetch('data/ultime.json');
        const data = await response.json();
        
        // Aggiungi alla cache locale
        data.forEach(l => state.cachedLessons[l.id] = l);
        
        const container = document.getElementById('latest-lessons-grid');
        container.innerHTML = data.map(lesson => createLessonCardHtml(lesson)).join('');
    } catch (err) {
        console.error("Errore nel caricamento delle ultime lezioni:", err);
    }
}

// 3. Carica il file specifico dell'anno (Lazy Loading) es. data/1979.json
async function loadYearLessons(year) {
    let lessons = [];

    try {
        // Se l'anno è già in cache, non fare una nuova chiamata di rete
        if (state.cachedLessons[`year_${year}`]) {
            lessons = state.cachedLessons[`year_${year}`];
        } else {
            const response = await fetch(`data/${year}.json`);
            if (response.ok) {
                lessons = await response.json();
                state.cachedLessons[`year_${year}`] = lessons;
                lessons.forEach(l => state.cachedLessons[l.id] = l);
            }
        }

        // Aggiorna il contatore sul pulsante dell'anno
        const countBadge = document.getElementById(`year-count-${year}`);
        if (countBadge) countBadge.textContent = `${lessons.length} lez.`;

        document.getElementById('filtered-view-title').textContent = `Lezioni dell'Anno ${year}`;
        document.getElementById('filtered-view-subtitle').textContent = `Archivio storico degli insegnamenti del ${year}`;
        
        renderFilteredLessons(lessons);

    } catch (err) {
        console.warn(`File data/${year}.json non ancora presente o vuoto.`);
        renderFilteredLessons([]);
    }
}

// 4. Gestione della Ricerca per Data / Titolo
function handleSearchKey(event) {
    if (event.key === 'Enter') executeSearch();
}

async function executeSearch() {
    const query = document.getElementById('date-search-input').value.trim().toLowerCase();
    if (!query) return;

    // Se la query è un anno a 4 cifre (es. 1979), carica direttamente l'anno
    if (/^\d{4}$/.test(query) && parseInt(query) >= 1969 && parseInt(query) <= 2002) {
        loadYearLessons(parseInt(query));
        return;
    }

    // Altrimenti cerca tra tutte le lezioni attualmente caricate in memoria
    const matches = Object.values(state.cachedLessons)
        .filter(item => Array.isArray(item) ? false : true) // Filtra array anno
        .filter(l => 
            l.data_lezione?.includes(query) || 
            l.titolo?.italiano?.toLowerCase().includes(query) || 
            l.codice_originale?.toLowerCase().includes(query)
        );

    document.getElementById('filtered-view-title').textContent = `Risultati Ricerca: "${query}"`;
    document.getElementById('filtered-view-subtitle').textContent = `Elementi corrispondenti trovati in memoria`;

    renderFilteredLessons(matches);
}

// 5. Preferiti
function toggleFavoritesView() {
    const favLessons = Object.values(state.cachedLessons)
        .filter(l => l.id && state.favorites.includes(l.id));

    document.getElementById('filtered-view-title').textContent = `I Miei Preferiti`;
    document.getElementById('filtered-view-subtitle').textContent = `Tutte le lezioni salvate nel tuo dispositivo`;

    renderFilteredLessons(favLessons);
}

function toggleFavorite(id, event) {
    if (event) event.stopPropagation();
    const idx = state.favorites.indexOf(id);
    if (idx > -1) state.favorites.splice(idx, 1);
    else state.favorites.push(id);

    localStorage.setItem('lot_favorites', JSON.stringify(state.favorites));
    updateFavBadge();

    // Rinfresca le viste se necessario
    const filteredView = document.getElementById('filtered-view');
    if (!filteredView.classList.contains('hidden')) {
        const title = document.getElementById('filtered-view-title').textContent;
        if (title.includes('Preferiti')) toggleFavoritesView();
    }
}

function updateFavBadge() {
    const badge = document.getElementById('fav-badge');
    if (state.favorites.length > 0) {
        badge.textContent = state.favorites.length;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// Renderizzazione Interfaccia
function renderFilteredLessons(lessons) {
    document.getElementById('home-view').classList.add('hidden');
    const filteredView = document.getElementById('filtered-view');
    const grid = document.getElementById('filtered-lessons-grid');
    const emptyState = document.getElementById('filtered-empty');
    const countBadge = document.getElementById('filtered-count-badge');

    filteredView.classList.remove('hidden');
    countBadge.textContent = `${lessons.length} ${lessons.length === 1 ? 'Lezione' : 'Lezioni'}`;

    if (lessons.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        grid.innerHTML = lessons.map(lesson => createLessonCardHtml(lesson)).join('');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showHomePage() {
    document.getElementById('filtered-view').classList.add('hidden');
    document.getElementById('home-view').classList.remove('hidden');
    document.getElementById('date-search-input').value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Template HTML per singola scheda lezione
function createLessonCardHtml(lesson) {
    const isFav = state.favorites.includes(lesson.id);

    return `
        <div class="bg-white rounded-2xl border border-sand-200 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden">
            <div class="p-6">
                <div class="flex items-center justify-between mb-3">
                    <span class="font-mono text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-md">
                        <i class="fa-regular fa-calendar mr-1"></i>${lesson.data_lezione}
                    </span>
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-stone-400 font-mono">${lesson.codice_originale}</span>
                        <button onclick="toggleFavorite('${lesson.id}', event)" class="text-stone-400 hover:text-amber-700 p-1 cursor-pointer">
                            <i class="${isFav ? 'fa-solid text-amber-700' : 'fa-regular'} fa-bookmark"></i>
                        </button>
                    </div>
                </div>

                <h3 onclick="openLessonModal('${lesson.id}')" class="text-xl font-serif font-bold text-stone-900 hover:text-amber-800 transition cursor-pointer leading-snug">
                    ${lesson.titolo.italiano}
                </h3>

                <p class="text-stone-600 text-xs sm:text-sm mt-3 line-clamp-3 leading-relaxed">
                    ${lesson.riassunto.sintesi_breve}
                </p>
            </div>

            <div class="px-6 py-3.5 bg-sand-50/80 border-t border-sand-100 flex items-center justify-between text-xs">
                <button onclick="openLessonModal('${lesson.id}')" class="font-semibold text-stone-700 hover:text-stone-900 cursor-pointer">
                    Leggi Sintesi <i class="fa-solid fa-chevron-right text-[10px] ml-0.5"></i>
                </button>

                ${lesson.podcast && lesson.podcast.audio_url ? `
                    <a href="${lesson.podcast.audio_url}" download class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-900 hover:bg-amber-200 rounded-xl font-semibold transition">
                        <i class="fa-solid fa-download text-[10px]"></i>
                        <span>Scarica (${lesson.podcast.durata_formattata})</span>
                    </a>
                ` : ''}
            </div>
        </div>
    `;
}

// Modal Dettaglio
function openLessonModal(id) {
    const lesson = state.cachedLessons[id];
    if (!lesson) return;

    document.getElementById('modal-code').textContent = lesson.codice_originale;
    document.getElementById('modal-date').textContent = `Data: ${lesson.data_lezione} (${lesson.luogo_originale || 'N/D'})`;
    document.getElementById('modal-title-it').textContent = lesson.titolo.italiano;
    document.getElementById('modal-title-en').textContent = lesson.titolo.originale || '';
    document.getElementById('modal-sintesi').textContent = lesson.riassunto.sintesi_breve;

    const audioEl = document.getElementById('modal-audio-element');
    const dlBtn = document.getElementById('modal-download-btn');

    if (lesson.podcast && lesson.podcast.audio_url) {
        audioEl.src = lesson.podcast.audio_url;
        dlBtn.href = lesson.podcast.audio_url;
        dlBtn.style.display = 'inline-flex';
    } else {
        audioEl.src = '';
        dlBtn.style.display = 'none';
    }

    // Citazione
    const citContainer = document.getElementById('modal-citazione-container');
    if (lesson.riassunto.citazioni_celebri && lesson.riassunto.citazioni_celebri.length > 0) {
        document.getElementById('modal-citazione').textContent = `"${lesson.riassunto.citazioni_celebri[0]}"`;
        citContainer.classList.remove('hidden');
    } else {
        citContainer.classList.add('hidden');
    }

    // Punti Chiave
    document.getElementById('modal-punti-chiave').innerHTML = (lesson.riassunto.punti_chiave || []).map(p => `
        <li class="flex items-start gap-2">
            <i class="fa-solid fa-check text-amber-700 text-xs mt-1"></i>
            <span>${p}</span>
        </li>
    `).join('');

    // Pratica
    const praticaBox = document.getElementById('modal-pratica-box');
    if (lesson.pratica && lesson.pratica.presente) {
        document.getElementById('modal-pratica-tipo').textContent = lesson.pratica.tipo;
        document.getElementById('modal-pratica-durata').textContent = `Tempo: ${lesson.pratica.durata_consigliata}`;
        document.getElementById('modal-pratica-nome').textContent = lesson.pratica.nome;
        document.getElementById('modal-pratica-istruzioni').textContent = lesson.pratica.istruzioni_sintetiche;
        praticaBox.classList.remove('hidden');
    } else {
        praticaBox.classList.add('hidden');
    }

    // Contenuto esteso
    document.getElementById('modal-contenuto-esteso').innerHTML = `<p>${lesson.riassunto.contenuto_esteso_markdown || ''}</p>`;
    document.getElementById('modal-original-link').href = lesson.url_originale || '#';

    // Preferito Modal Button
    const favBtn = document.getElementById('modal-bookmark-btn');
    const isFav = state.favorites.includes(lesson.id);
    favBtn.onclick = (e) => toggleFavorite(lesson.id, e);
    favBtn.innerHTML = `<i class="${isFav ? 'fa-solid text-amber-400' : 'fa-regular'} fa-bookmark"></i> <span>${isFav ? 'Nei Preferiti' : 'Salva nei Preferiti'}</span>`;

    const modal = document.getElementById('lesson-modal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.remove('opacity-0'), 10);
    document.body.style.overflow = 'hidden';
}

function closeLessonModal() {
    const modal = document.getElementById('lesson-modal');
    document.getElementById('modal-audio-element').pause();
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }, 300);
}

function openInfoModal() {
    const modal = document.getElementById('info-modal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.remove('opacity-0'), 10);
}

function closeInfoModal() {
    const modal = document.getElementById('info-modal');
    modal.classList.add('opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 300);
}