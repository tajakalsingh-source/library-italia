// Il sito legge data/indice.json (elenco lezioni) e data/ANNO.json (sintesi), generati da build.py
let LESSONS = [];
const yearCache = {};
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

window.addEventListener('DOMContentLoaded', async () => {
    try {
        LESSONS = await (await fetch('data/indice.json')).json();
    } catch (e) {
        $('home-subtitle').textContent = 'Impossibile caricare data/indice.json (eseguire build.py e aprire il sito da un server web).';
        return;
    }
    renderYears();
});

function renderYears() {
    const counts = {};
    LESSONS.forEach(l => { const y = l.data.slice(0, 4); counts[y] = (counts[y] || 0) + 1; });
    const years = Object.keys(counts).sort();
    $('home-subtitle').textContent = `${LESSONS.length} lezioni, dal ${years[0]} al ${years[years.length - 1]}`;
    $('years-grid').innerHTML = years.map(y => `
        <button onclick="showYear('${y}')" class="h-14 sm:h-16 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95 border cursor-pointer bg-white hover:bg-amber-50 text-stone-700 border-sand-200">
            <span class="text-sm sm:text-base font-bold font-mono">${y}</span>
            <span class="text-[10px] font-medium text-amber-800">${counts[y]} lez.</span>
        </button>`).join('');
}

function showYear(y) { showList(`Lezioni del ${y}`, LESSONS.filter(l => l.data.startsWith(y))); }

function doSearch() {
    const q = $('search').value.trim().toLowerCase();
    if (!q) return;
    if (/^\d{4}$/.test(q)) return showYear(q);
    showList(`Risultati per "${$('search').value.trim()}"`, LESSONS.filter(l =>
        [l.data, l.titolo, l.luogo, l.codice].some(v => (v || '').toLowerCase().includes(q))));
}

function showList(title, items) {
    $('home-view').classList.add('hidden');
    $('list-view').classList.remove('hidden');
    $('list-title').textContent = title;
    $('list-count').textContent = `${items.length} ${items.length === 1 ? 'lezione' : 'lezioni'}`;
    $('list-empty').classList.toggle('hidden', items.length > 0);
    $('lessons-grid').innerHTML = items.map(card).join('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showHome() {
    $('list-view').classList.add('hidden');
    $('home-view').classList.remove('hidden');
    $('search').value = '';
}

function card(l) {
    const i = LESSONS.indexOf(l);
    return `
    <div class="bg-white rounded-2xl border border-sand-200 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden">
        <div class="p-6">
            <span class="font-mono text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-md"><i class="fa-regular fa-calendar mr-1"></i>${esc(l.data)}</span>
            ${l.luogo ? `<span class="text-xs text-stone-500 ml-2"><i class="fa-solid fa-location-dot mr-1"></i>${esc(l.luogo)}</span>` : ''}
            <h3 onclick="openLesson(${i})" class="text-xl font-serif font-bold text-stone-900 hover:text-amber-800 transition cursor-pointer leading-snug mt-3">${esc(l.titolo || 'Lezione ' + l.codice)}</h3>
        </div>
        <div class="px-6 py-3.5 bg-sand-50/80 border-t border-sand-100 flex items-center justify-between text-xs">
            <button onclick="openLesson(${i})" class="font-semibold text-stone-700 hover:text-stone-900 cursor-pointer">Leggi sintesi <i class="fa-solid fa-chevron-right text-[10px] ml-0.5"></i></button>
            ${l.audio ? `<a href="${esc(l.audio)}" download class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-900 hover:bg-amber-200 rounded-xl font-semibold transition"><i class="fa-solid fa-download text-[10px]"></i> Scarica audio</a>` : ''}
        </div>
    </div>`;
}

async function openLesson(i) {
    const l = LESSONS[i];
    $('m-meta').textContent = `${l.data}${l.luogo ? ' · ' + l.luogo : ''} · n. ${l.codice}`;
    $('m-title').textContent = l.titolo || 'Lezione ' + l.codice;
    $('m-link').style.display = l.link ? 'inline-flex' : 'none';
    if (l.link) $('m-link').href = l.link;
    $('m-audio-box').style.display = l.audio ? 'block' : 'none';
    $('m-audio').src = l.audio || '';
    $('m-download').href = l.audio || '#';
    $('m-sintesi').innerHTML = '<p>Caricamento…</p>';
    $('lesson-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    const y = l.data.slice(0, 4);
    try {
        yearCache[y] = yearCache[y] || await (await fetch(`data/${y}.json`)).json();
    } catch (e) { yearCache[y] = {}; }
    $('m-sintesi').innerHTML = yearCache[y][l.codice] || '<p><em>Sintesi non ancora disponibile.</em></p>';
}

function closeLesson() {
    $('m-audio').pause();
    $('lesson-modal').classList.add('hidden');
    document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLesson(); });
