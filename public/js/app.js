// ---------- Utils ----------
function uid() {
  return (crypto.randomUUID) ? crypto.randomUUID() : "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- Storage ----------
const STORAGE_KEYS = { exercises: "muscu_exercises", program: "muscu_program", history: "muscu_history" };

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

const state = {
  exercises: load(STORAGE_KEYS.exercises, null),
  program: load(STORAGE_KEYS.program, []),
  history: load(STORAGE_KEYS.history, []),
};

if (!state.exercises) {
  state.exercises = DEFAULT_EXERCISES.map((e) => ({ id: uid(), name: e.name, group: e.group }));
  save(STORAGE_KEYS.exercises, state.exercises);
}

function persistExercises() { save(STORAGE_KEYS.exercises, state.exercises); }
function persistProgram() { save(STORAGE_KEYS.program, state.program); }
function persistHistory() { save(STORAGE_KEYS.history, state.history); }

let currentSession = null;

// ---------- Tabs / navigation ----------
const tabs = document.querySelectorAll(".tab");
const viewEls = document.querySelectorAll(".view");
const topbarTitle = document.getElementById("topbar-title");
const TITLES = { programme: "Programme", seance: "Séance", historique: "Historique", exercices: "Exercices" };

function switchView(name) {
  tabs.forEach((t) => t.classList.toggle("active", t.dataset.view === name));
  viewEls.forEach((v) => v.classList.toggle("active", v.id === "view-" + name));
  topbarTitle.textContent = TITLES[name];
  if (name === "programme") renderProgramme();
  if (name === "seance") renderSeance();
  if (name === "historique") renderHistorique();
  if (name === "exercices") renderExercices();
}
tabs.forEach((t) => t.addEventListener("click", () => switchView(t.dataset.view)));

// ---------- Modal ----------
const modalRoot = document.getElementById("modal-root");
function closeModal() { modalRoot.innerHTML = ""; }
function openModal(titleText, bodyHtml) {
  modalRoot.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal-sheet">
        <h2 class="modal-title">${esc(titleText)}</h2>
        ${bodyHtml}
      </div>
    </div>`;
  document.getElementById("modal-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "modal-backdrop") closeModal();
  });
}

// =====================================================
// PROGRAMME
// =====================================================
function renderProgramme() {
  const list = document.getElementById("programme-list");
  if (!state.program.length) {
    list.innerHTML = `<p class="empty-state">Aucun jour pour l'instant.<br>Ajoute un jour pour commencer ton programme.</p>`;
    return;
  }
  list.innerHTML = state.program.map((day) => dayCardHtml(day)).join("");
}

function dayCardHtml(day) {
  return `
  <div class="card">
    <div class="card-header">
      <h3 class="card-title">${esc(day.name)}</h3>
      <div class="row">
        <button class="btn btn-icon" data-action="rename-day" data-day-id="${day.id}">✏️</button>
        <button class="btn btn-icon" data-action="delete-day" data-day-id="${day.id}">🗑️</button>
      </div>
    </div>
    ${day.items.length ? day.items.map((item, idx) => exoRowHtml(day.id, item, idx)).join("") : `<p class="hint">Aucun exercice. Ajoute-en un ci-dessous.</p>`}
    <button class="btn btn-outline btn-block" data-action="add-exo-to-day" data-day-id="${day.id}">+ Ajouter un exercice</button>
  </div>`;
}

function exoRowHtml(dayId, item, idx) {
  return `
  <div class="exo-row">
    <div>
      <div class="exo-row-name">${esc(item.name)}</div>
      <div class="exo-row-target">${item.sets} séries × ${item.reps} reps</div>
    </div>
    <div class="row">
      <button class="btn btn-icon" data-action="edit-item" data-day-id="${dayId}" data-item-index="${idx}">✏️</button>
      <button class="btn btn-icon" data-action="delete-item" data-day-id="${dayId}" data-item-index="${idx}">✕</button>
    </div>
  </div>`;
}

document.getElementById("programme-list").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const dayId = btn.dataset.dayId;
  if (action === "rename-day") openRenameDayModal(dayId);
  if (action === "delete-day") deleteDay(dayId);
  if (action === "add-exo-to-day") openAddExerciseModal(dayId);
  if (action === "edit-item") openEditItemModal(dayId, +btn.dataset.itemIndex);
  if (action === "delete-item") deleteItem(dayId, +btn.dataset.itemIndex);
});

document.getElementById("btn-add-day").addEventListener("click", () => {
  openModal("Nouveau jour", `
    <div class="field"><label>Nom du jour</label><input class="input" id="input-day-name" placeholder="Ex: Push, Pull, Legs..."></div>
    <button class="btn btn-primary btn-block" id="btn-save-day">Créer</button>
  `);
  document.getElementById("input-day-name").focus();
  document.getElementById("btn-save-day").addEventListener("click", () => {
    const name = document.getElementById("input-day-name").value.trim();
    if (!name) return;
    state.program.push({ id: uid(), name, items: [] });
    persistProgram();
    closeModal();
    renderProgramme();
  });
});

function openRenameDayModal(dayId) {
  const day = state.program.find((d) => d.id === dayId);
  openModal("Renommer le jour", `
    <div class="field"><label>Nom</label><input class="input" id="input-rename-day" value="${esc(day.name)}"></div>
    <button class="btn btn-primary btn-block" id="btn-save-rename">Enregistrer</button>
  `);
  document.getElementById("btn-save-rename").addEventListener("click", () => {
    const name = document.getElementById("input-rename-day").value.trim();
    if (!name) return;
    day.name = name;
    persistProgram();
    closeModal();
    renderProgramme();
  });
}

function deleteDay(dayId) {
  if (!confirm("Supprimer ce jour du programme ?")) return;
  state.program = state.program.filter((d) => d.id !== dayId);
  persistProgram();
  renderProgramme();
}

function openAddExerciseModal(dayId) {
  openModal("Ajouter un exercice", `
    <input class="input" id="modal-exo-search" placeholder="Rechercher...">
    <div id="modal-exo-options" class="stack" style="max-height:220px; overflow-y:auto;"></div>
    <div id="modal-exo-config" class="hidden stack">
      <div class="grid-3" style="grid-template-columns: 1fr 1fr;">
        <div class="field"><label>Séries</label><input class="input input-num" id="input-sets" type="number" inputmode="numeric" value="3" min="1"></div>
        <div class="field"><label>Reps</label><input class="input input-num" id="input-reps" type="number" inputmode="numeric" value="10" min="1"></div>
      </div>
      <p class="hint">Le poids se règle directement pendant la séance, série par série.</p>
      <button class="btn btn-primary btn-block" id="btn-confirm-add-exo">Ajouter au jour</button>
    </div>
  `);
  let selectedExoId = null;

  function renderOptions(filter) {
    const container = document.getElementById("modal-exo-options");
    const f = (filter || "").trim().toLowerCase();
    const filtered = state.exercises.filter((e) => e.name.toLowerCase().includes(f));
    container.innerHTML = filtered.length
      ? filtered.map((e) => `<button class="btn btn-outline btn-block" style="text-align:left" data-exo-id="${e.id}">${esc(e.name)} <span class="card-sub">· ${esc(e.group)}</span></button>`).join("")
      : `<p class="hint">Aucun résultat.</p>`;
  }
  renderOptions("");

  document.getElementById("modal-exo-search").addEventListener("input", (e) => renderOptions(e.target.value));
  document.getElementById("modal-exo-options").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-exo-id]");
    if (!btn) return;
    selectedExoId = btn.dataset.exoId;
    document.getElementById("modal-exo-config").classList.remove("hidden");
    document.getElementById("modal-exo-config").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  document.getElementById("btn-confirm-add-exo").addEventListener("click", () => {
    if (!selectedExoId) return;
    const exo = state.exercises.find((e) => e.id === selectedExoId);
    const sets = parseInt(document.getElementById("input-sets").value) || 1;
    const reps = parseInt(document.getElementById("input-reps").value) || 1;
    const day = state.program.find((d) => d.id === dayId);
    day.items.push({ exerciseId: exo.id, name: exo.name, sets, reps });
    persistProgram();
    closeModal();
    renderProgramme();
  });
}

function openEditItemModal(dayId, itemIndex) {
  const day = state.program.find((d) => d.id === dayId);
  const item = day.items[itemIndex];
  openModal("Modifier " + item.name, `
    <div class="grid-3" style="grid-template-columns: 1fr 1fr;">
      <div class="field"><label>Séries</label><input class="input input-num" id="input-sets" type="number" value="${item.sets}" min="1"></div>
      <div class="field"><label>Reps</label><input class="input input-num" id="input-reps" type="number" value="${item.reps}" min="1"></div>
    </div>
    <button class="btn btn-primary btn-block" id="btn-save-item">Enregistrer</button>
  `);
  document.getElementById("btn-save-item").addEventListener("click", () => {
    item.sets = parseInt(document.getElementById("input-sets").value) || 1;
    item.reps = parseInt(document.getElementById("input-reps").value) || 1;
    persistProgram();
    closeModal();
    renderProgramme();
  });
}

function deleteItem(dayId, itemIndex) {
  const day = state.program.find((d) => d.id === dayId);
  day.items.splice(itemIndex, 1);
  persistProgram();
  renderProgramme();
}

// =====================================================
// SEANCE
// =====================================================
function renderSeance() {
  const picker = document.getElementById("seance-picker");
  const active = document.getElementById("seance-active");
  if (currentSession) {
    picker.classList.add("hidden");
    active.classList.remove("hidden");
    renderActiveSession();
  } else {
    picker.classList.remove("hidden");
    active.classList.add("hidden");
    renderSeancePicker();
  }
}

function renderSeancePicker() {
  const container = document.getElementById("seance-day-buttons");
  const hint = document.querySelector("#seance-picker .hint");
  if (!state.program.length) {
    container.innerHTML = "";
    hint.textContent = "Tu n'as pas encore de programme. Va dans l'onglet Programme pour créer des jours d'entraînement.";
    return;
  }
  hint.textContent = "Choisis un jour de ton programme pour démarrer une séance.";
  container.innerHTML = state.program.map((day) => `<button class="btn btn-primary btn-block" data-start-day="${day.id}">${esc(day.name)}</button>`).join("");
}

document.getElementById("seance-day-buttons").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-start-day]");
  if (!btn) return;
  startSession(btn.dataset.startDay);
});

function startSession(dayId) {
  const day = state.program.find((d) => d.id === dayId);
  if (!day) return;
  currentSession = {
    dayId: day.id,
    dayName: day.name,
    date: new Date().toISOString(),
    items: day.items.map((item) => {
      const last = findLastPerformance(item.exerciseId);
      const weightFor = (i) => {
        if (!last || !last.sets.length) return 0;
        return (last.sets[i] || last.sets[last.sets.length - 1]).weight;
      };
      return {
        exerciseId: item.exerciseId,
        name: item.name,
        sets: Array.from({ length: item.sets }, (_, i) => ({ reps: item.reps, weight: weightFor(i), done: false })),
      };
    }),
  };
  renderSeance();
}

function findLastPerformance(exerciseId) {
  for (let i = state.history.length - 1; i >= 0; i--) {
    const session = state.history[i];
    const found = session.items.find((it) => it.exerciseId === exerciseId);
    if (found && found.sets.length) return { date: session.date, sets: found.sets };
  }
  return null;
}

function formatSets(sets) {
  return sets.map((s) => `${s.weight || 0}kg×${s.reps || 0}`).join(", ");
}

function renderActiveSession() {
  const container = document.getElementById("seance-active");
  const dateStr = new Date(currentSession.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  container.innerHTML = `
    <div class="row-between">
      <h3 class="card-title">${esc(currentSession.dayName)}</h3>
      <button class="btn btn-danger btn-sm" id="btn-cancel-session">Annuler</button>
    </div>
    <p class="hint">${dateStr}</p>
    ${currentSession.items.map((item, idx) => sessionExoCardHtml(item, idx)).join("")}
    <button class="btn btn-primary btn-block" id="btn-finish-session">Terminer la séance</button>
  `;
  document.getElementById("btn-cancel-session").addEventListener("click", () => {
    if (confirm("Annuler cette séance ? Rien ne sera enregistré.")) {
      currentSession = null;
      renderSeance();
    }
  });
  document.getElementById("btn-finish-session").addEventListener("click", finishSession);
}

function sessionExoCardHtml(item, idx) {
  const last = findLastPerformance(item.exerciseId);
  return `
  <div class="card">
    <div class="card-header">
      <h4 class="card-title">${esc(item.name)}</h4>
      <button class="btn btn-outline btn-sm" data-action="add-set" data-item-index="${idx}">+ série</button>
    </div>
    ${last ? `<div class="last-time">Dernière fois : ${esc(formatSets(last.sets))}</div>` : ""}
    <div class="stack" style="gap:8px">
      ${item.sets.map((s, sIdx) => setRowHtml(idx, s, sIdx)).join("")}
    </div>
  </div>`;
}

function setRowHtml(itemIdx, s, setIdx) {
  return `
  <div class="set-row">
    <div class="set-row-label">${setIdx + 1}</div>
    <input class="input input-num" type="number" inputmode="decimal" step="0.5" min="0" value="${s.weight}" data-field="weight" data-item-index="${itemIdx}" data-set-index="${setIdx}" placeholder="kg">
    <input class="input input-num" type="number" inputmode="numeric" min="0" value="${s.reps}" data-field="reps" data-item-index="${itemIdx}" data-set-index="${setIdx}" placeholder="reps">
    <button class="set-done ${s.done ? "checked" : ""}" data-action="toggle-done" data-item-index="${itemIdx}" data-set-index="${setIdx}">✓</button>
  </div>`;
}

document.getElementById("seance-active").addEventListener("click", (e) => {
  const addSetBtn = e.target.closest('[data-action="add-set"]');
  if (addSetBtn) {
    const idx = +addSetBtn.dataset.itemIndex;
    const item = currentSession.items[idx];
    const lastSet = item.sets[item.sets.length - 1];
    item.sets.push({ reps: lastSet.reps, weight: lastSet.weight, done: false });
    renderActiveSession();
    return;
  }
  const toggleBtn = e.target.closest('[data-action="toggle-done"]');
  if (toggleBtn) {
    const idx = +toggleBtn.dataset.itemIndex;
    const sIdx = +toggleBtn.dataset.setIndex;
    currentSession.items[idx].sets[sIdx].done = !currentSession.items[idx].sets[sIdx].done;
    renderActiveSession();
  }
});

document.getElementById("seance-active").addEventListener("input", (e) => {
  const input = e.target.closest("[data-field]");
  if (!input) return;
  const idx = +input.dataset.itemIndex;
  const sIdx = +input.dataset.setIndex;
  const field = input.dataset.field;
  const val = field === "reps" ? (parseInt(input.value) || 0) : (parseFloat(input.value) || 0);
  currentSession.items[idx].sets[sIdx][field] = val;
});

function finishSession() {
  if (!confirm("Enregistrer cette séance ?")) return;
  const session = {
    id: uid(),
    date: currentSession.date,
    dayId: currentSession.dayId,
    dayName: currentSession.dayName,
    items: currentSession.items.map((item) => ({
      exerciseId: item.exerciseId,
      name: item.name,
      sets: item.sets.map((s) => ({ reps: s.reps, weight: s.weight })),
    })),
  };
  state.history.push(session);
  persistHistory();
  currentSession = null;
  switchView("historique");
}

// =====================================================
// HISTORIQUE
// =====================================================
function renderHistorique() {
  const container = document.getElementById("historique-list");
  if (!state.history.length) {
    container.innerHTML = `<p class="empty-state">Aucune séance enregistrée pour l'instant.</p>`;
    return;
  }
  const sorted = [...state.history].sort((a, b) => new Date(b.date) - new Date(a.date));
  container.innerHTML = sorted.map((session) => historyCardHtml(session)).join("");
}

function historyCardHtml(session) {
  const dateStr = new Date(session.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return `
  <div class="card">
    <div class="card-header">
      <div>
        <h3 class="card-title">${esc(session.dayName)}</h3>
        <div class="card-sub">${dateStr}</div>
      </div>
      <button class="btn btn-icon" data-action="delete-session" data-session-id="${session.id}">🗑️</button>
    </div>
    ${session.items.map((item) => `
      <div class="exo-row">
        <div>
          <div class="exo-row-name">${esc(item.name)}</div>
          <div class="exo-row-target">${esc(formatSets(item.sets))}</div>
        </div>
      </div>
    `).join("")}
  </div>`;
}

document.getElementById("historique-list").addEventListener("click", (e) => {
  const btn = e.target.closest('[data-action="delete-session"]');
  if (!btn) return;
  if (!confirm("Supprimer cette séance ?")) return;
  state.history = state.history.filter((s) => s.id !== btn.dataset.sessionId);
  persistHistory();
  renderHistorique();
});

// =====================================================
// EXERCICES
// =====================================================
function groupExercises(list) {
  const groups = {};
  list.forEach((e) => { (groups[e.group] = groups[e.group] || []).push(e); });
  return groups;
}

function renderExercices(filter) {
  const container = document.getElementById("exo-list");
  const f = (filter || "").trim().toLowerCase();
  const filtered = state.exercises.filter((e) => e.name.toLowerCase().includes(f));
  if (!filtered.length) {
    container.innerHTML = `<p class="empty-state">Aucun exercice trouvé.</p>`;
    return;
  }
  const groups = groupExercises(filtered);
  const groupNames = Object.keys(groups).sort();
  container.innerHTML = groupNames.map((g) => `
    <div>
      <div class="exo-group-title">${esc(g)}</div>
      <div class="stack">
        ${groups[g].map((e) => `
          <div class="exo-item">
            <span>${esc(e.name)}</span>
            <button class="btn btn-icon" data-action="delete-exo" data-exo-id="${e.id}">🗑️</button>
          </div>
        `).join("")}
      </div>
    </div>
  `).join("");
}

document.getElementById("exo-search").addEventListener("input", (e) => renderExercices(e.target.value));

document.getElementById("exo-list").addEventListener("click", (e) => {
  const btn = e.target.closest('[data-action="delete-exo"]');
  if (!btn) return;
  if (!confirm("Supprimer cet exercice de la bibliothèque ?")) return;
  state.exercises = state.exercises.filter((ex) => ex.id !== btn.dataset.exoId);
  persistExercises();
  renderExercices(document.getElementById("exo-search").value);
});

document.getElementById("btn-add-exo").addEventListener("click", () => {
  const existingGroups = [...new Set(state.exercises.map((e) => e.group))].sort();
  openModal("Nouvel exercice", `
    <div class="field"><label>Nom</label><input class="input" id="input-exo-name" placeholder="Ex: Développé couché"></div>
    <div class="field">
      <label>Groupe musculaire</label>
      <input class="input" id="input-exo-group" list="exo-group-options" placeholder="Ex: Pectoraux">
      <datalist id="exo-group-options">
        ${existingGroups.map((g) => `<option value="${esc(g)}"></option>`).join("")}
      </datalist>
    </div>
    <button class="btn btn-primary btn-block" id="btn-save-exo">Ajouter</button>
  `);
  document.getElementById("input-exo-name").focus();
  document.getElementById("btn-save-exo").addEventListener("click", () => {
    const name = document.getElementById("input-exo-name").value.trim();
    const group = document.getElementById("input-exo-group").value.trim() || "Autre";
    if (!name) return;
    state.exercises.push({ id: uid(), name, group });
    persistExercises();
    closeModal();
    renderExercices();
  });
});

// =====================================================
// INIT
// =====================================================
switchView("programme");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
