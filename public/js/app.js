// ---------- Utils ----------
function uid() {
  return (crypto.randomUUID) ? crypto.randomUUID() : "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- Icons ----------
const ICON_EDIT = `<svg viewBox="0 0 24 24"><path d="M4 20l1-4.5L15.5 5 19 8.5 8.5 19 4 20Z"></path><path d="M13 7l4 4"></path></svg>`;
const ICON_TRASH = `<svg viewBox="0 0 24 24"><path d="M5 7h14"></path><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path><path d="M7 7l1 12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-12"></path><path d="M10 11v6M14 11v6"></path></svg>`;
const ICON_CLOSE = `<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"></path></svg>`;
const ICON_CHEVRON_UP = `<svg viewBox="0 0 24 24"><path d="M6 14l6-6 6 6"></path></svg>`;
const ICON_CHEVRON_DOWN = `<svg viewBox="0 0 24 24"><path d="M6 10l6 6 6-6"></path></svg>`;
const ICON_COPY = `<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path></svg>`;

// ---------- Toast / undo ----------
const toastRoot = document.getElementById("toast-root");
let pendingUndo = null;

function showUndoToast(message, undoFn) {
  if (pendingUndo) clearTimeout(pendingUndo.timeoutId);
  toastRoot.innerHTML = `
    <div class="toast">
      <span>${esc(message)}</span>
      <button class="toast-undo" id="toast-undo-btn">Annuler</button>
    </div>`;
  document.getElementById("toast-undo-btn").addEventListener("click", () => {
    clearTimeout(pendingUndo.timeoutId);
    pendingUndo = null;
    toastRoot.innerHTML = "";
    undoFn();
  });
  const timeoutId = setTimeout(() => {
    pendingUndo = null;
    toastRoot.innerHTML = "";
  }, 5000);
  pendingUndo = { timeoutId };
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
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📋</div>Aucun jour pour l'instant.<br>Ajoute un jour pour commencer ton programme.</div>`;
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
        <button class="btn btn-icon" data-action="duplicate-day" data-day-id="${day.id}">${ICON_COPY}</button>
        <button class="btn btn-icon" data-action="rename-day" data-day-id="${day.id}">${ICON_EDIT}</button>
        <button class="btn btn-icon btn-icon-danger" data-action="delete-day" data-day-id="${day.id}">${ICON_TRASH}</button>
      </div>
    </div>
    ${day.items.length ? day.items.map((item, idx) => exoRowHtml(day.id, item, idx, day.items.length)).join("") : `<p class="hint">Aucun exercice. Ajoute-en un ci-dessous.</p>`}
    <button class="btn btn-outline btn-block" data-action="add-exo-to-day" data-day-id="${day.id}">+ Ajouter un exercice</button>
  </div>`;
}

function exoRowHtml(dayId, item, idx, count) {
  return `
  <div class="exo-row">
    <div>
      <div class="exo-row-name">${esc(item.name)}</div>
      <div class="exo-row-target">${item.sets} séries × ${item.reps} reps</div>
    </div>
    <div class="row">
      <div class="reorder-stepper">
        <button class="reorder-btn" data-action="move-item-up" data-day-id="${dayId}" data-item-index="${idx}" ${idx === 0 ? "disabled" : ""}>${ICON_CHEVRON_UP}</button>
        <button class="reorder-btn" data-action="move-item-down" data-day-id="${dayId}" data-item-index="${idx}" ${idx === count - 1 ? "disabled" : ""}>${ICON_CHEVRON_DOWN}</button>
      </div>
      <button class="btn btn-icon" data-action="edit-item" data-day-id="${dayId}" data-item-index="${idx}">${ICON_EDIT}</button>
      <button class="btn btn-icon btn-icon-danger" data-action="delete-item" data-day-id="${dayId}" data-item-index="${idx}">${ICON_CLOSE}</button>
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
  if (action === "duplicate-day") duplicateDay(dayId);
  if (action === "add-exo-to-day") openAddExerciseModal(dayId);
  if (action === "edit-item") openEditItemModal(dayId, +btn.dataset.itemIndex);
  if (action === "delete-item") deleteItem(dayId, +btn.dataset.itemIndex);
  if (action === "move-item-up") moveItem(dayId, +btn.dataset.itemIndex, -1);
  if (action === "move-item-down") moveItem(dayId, +btn.dataset.itemIndex, 1);
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
  const idx = state.program.findIndex((d) => d.id === dayId);
  if (idx === -1) return;
  const [removed] = state.program.splice(idx, 1);
  persistProgram();
  renderProgramme();
  showUndoToast(`"${removed.name}" supprimé`, () => {
    state.program.splice(idx, 0, removed);
    persistProgram();
    renderProgramme();
  });
}

function duplicateDay(dayId) {
  const idx = state.program.findIndex((d) => d.id === dayId);
  if (idx === -1) return;
  const day = state.program[idx];
  const copy = { id: uid(), name: day.name + " (copie)", items: day.items.map((it) => ({ ...it })) };
  state.program.splice(idx + 1, 0, copy);
  persistProgram();
  renderProgramme();
}

function moveItem(dayId, itemIndex, direction) {
  const day = state.program.find((d) => d.id === dayId);
  const newIndex = itemIndex + direction;
  if (!day || newIndex < 0 || newIndex >= day.items.length) return;
  [day.items[itemIndex], day.items[newIndex]] = [day.items[newIndex], day.items[itemIndex]];
  persistProgram();
  renderProgramme();
}

function openAddExerciseModal(dayId) {
  openModal("Ajouter un exercice", `
    <input class="input" id="modal-exo-search" placeholder="Rechercher...">
    <div id="modal-exo-options" class="stack" style="max-height:220px; overflow-y:auto;"></div>
    <div id="modal-exo-config" class="hidden stack">
      <div class="grid-2">
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
    <div class="grid-2">
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
  const [removed] = day.items.splice(itemIndex, 1);
  persistProgram();
  renderProgramme();
  showUndoToast(`"${removed.name}" retiré du jour`, () => {
    day.items.splice(itemIndex, 0, removed);
    persistProgram();
    renderProgramme();
  });
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
    <div class="set-columns"><span>#</span><span>Poids</span><span>Reps</span><span></span><span></span></div>
    <div class="stack" style="gap:8px">
      ${item.sets.map((s, sIdx) => setRowHtml(idx, s, sIdx, item.sets.length)).join("")}
    </div>
  </div>`;
}

function setRowHtml(itemIdx, s, setIdx, count) {
  return `
  <div class="set-row">
    <div class="set-row-label">${setIdx + 1}</div>
    <input class="input input-num" type="number" inputmode="decimal" step="0.5" min="0" value="${s.weight}" data-field="weight" data-item-index="${itemIdx}" data-set-index="${setIdx}" placeholder="kg">
    <input class="input input-num" type="number" inputmode="numeric" min="0" value="${s.reps}" data-field="reps" data-item-index="${itemIdx}" data-set-index="${setIdx}" placeholder="reps">
    <button class="set-done ${s.done ? "checked" : ""}" data-action="toggle-done" data-item-index="${itemIdx}" data-set-index="${setIdx}">✓</button>
    <button class="set-remove" data-action="delete-set" data-item-index="${itemIdx}" data-set-index="${setIdx}" ${count <= 1 ? "disabled" : ""}>${ICON_CLOSE}</button>
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
    return;
  }
  const removeSetBtn = e.target.closest('[data-action="delete-set"]');
  if (removeSetBtn) {
    const idx = +removeSetBtn.dataset.itemIndex;
    const sIdx = +removeSetBtn.dataset.setIndex;
    const item = currentSession.items[idx];
    if (item.sets.length <= 1) return;
    item.sets.splice(sIdx, 1);
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
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🕒</div>Aucune séance enregistrée pour l'instant.</div>`;
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
      <button class="btn btn-icon btn-icon-danger" data-action="delete-session" data-session-id="${session.id}">${ICON_TRASH}</button>
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
  const idx = state.history.findIndex((s) => s.id === btn.dataset.sessionId);
  if (idx === -1) return;
  const [removed] = state.history.splice(idx, 1);
  persistHistory();
  renderHistorique();
  showUndoToast("Séance supprimée", () => {
    state.history.splice(idx, 0, removed);
    persistHistory();
    renderHistorique();
  });
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
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📚</div>Aucun exercice trouvé.</div>`;
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
            <button class="btn btn-icon btn-icon-danger" data-action="delete-exo" data-exo-id="${e.id}">${ICON_TRASH}</button>
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
  const idx = state.exercises.findIndex((ex) => ex.id === btn.dataset.exoId);
  if (idx === -1) return;
  const [removed] = state.exercises.splice(idx, 1);
  persistExercises();
  renderExercices(document.getElementById("exo-search").value);
  showUndoToast(`"${removed.name}" supprimé`, () => {
    state.exercises.splice(idx, 0, removed);
    persistExercises();
    renderExercices(document.getElementById("exo-search").value);
  });
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
