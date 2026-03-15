/**
 * ui.js — All UI interactions: Case File panel, Dossier, toasts, notifications
 */

const UI = (() => {
  // ---- Case File panel ----

  function openCaseFile(loc) {
    const panel     = document.getElementById('case-panel');
    const title     = document.getElementById('case-title');
    const witness      = document.getElementById('case-witness');
    const farrowNotes  = document.getElementById('case-farrow-notes');
    const mystery   = document.getElementById('case-mystery');
    const choices   = document.getElementById('case-choices');
    const result    = document.getElementById('case-result');

    // Populate content
    title.textContent    = loc.name;

    // Character byline
    let charEl = document.getElementById('case-character');
    if (!charEl) {
      charEl = document.createElement('div');
      charEl.id = 'case-character';
      witness.parentNode.insertBefore(charEl, witness);
    }
    charEl.textContent = loc.character
      ? `${loc.character.name} — ${loc.character.role}`
      : '';

    witness.textContent     = loc.witness;
    farrowNotes.textContent = loc.farrow_notes || '';

    // Already solved — show clue directly
    if (Game.isSolved(loc.id)) {
      mystery.textContent = loc.mystery;
      choices.innerHTML   = '';
      result.textContent  = `🔎 ${loc.solved_text}`;
      result.className    = 'result-solved';
      result.classList.remove('hidden');
    } else {
      // Fresh / unanswered
      mystery.textContent = loc.mystery;
      choices.innerHTML   = '';
      result.className    = 'hidden';
      result.textContent  = '';

      loc.choices.forEach((text, idx) => {
        const btn = document.createElement('button');
        btn.className   = 'choice-btn';
        btn.textContent = text;
        btn.addEventListener('click', () => handleAnswer(loc, idx, choices, result));
        choices.appendChild(btn);
      });
    }

    // Show panel
    panel.classList.remove('hidden');
    requestAnimationFrame(() => panel.classList.add('visible'));
  }

  function handleAnswer(loc, idx, choicesEl, resultEl) {
    const buttons = choicesEl.querySelectorAll('.choice-btn');
    buttons.forEach(b => b.disabled = true);

    if (idx === loc.answer) {
      buttons[idx].classList.add('correct');
      Game.solve(loc.id, loc.solved_text);
      MapView.updateMarker(loc.id);
      updateDossierCount();
      if (typeof Story !== 'undefined') Story.onSolve(loc, MapView.getLocations());

      resultEl.textContent = `✅ Elementary! ${loc.solved_text}`;
      resultEl.className   = 'result-correct';
    } else {
      buttons[idx].classList.add('wrong');
      buttons[loc.answer].classList.add('correct');
      resultEl.textContent = `🕵️ Not quite. The correct answer: "${loc.choices[loc.answer]}"`;
      resultEl.className   = 'result-wrong';
    }

    resultEl.classList.remove('hidden');
  }

  function closeCaseFile() {
    const panel = document.getElementById('case-panel');
    panel.classList.remove('visible');
    setTimeout(() => panel.classList.add('hidden'), 350);
  }

  // ---- Dossier ----

  function openDossier() {
    const panel    = document.getElementById('dossier-panel');
    const summary  = document.getElementById('dossier-summary');
    const entries  = document.getElementById('dossier-entries');
    const locations = MapView.getLocations();
    const solved   = Game.solvedCount();

    summary.textContent = `${solved} of ${locations.length} cases solved.`;
    entries.innerHTML   = '';

    locations.forEach(loc => {
      const isSolved   = Game.isSolved(loc.id);
      const isUnlocked = Game.isUnlocked(loc.id);
      const clue       = Game.getClue(loc.id);

      const div = document.createElement('div');
      div.className = `dossier-entry ${isSolved ? 'entry-solved' : isUnlocked ? 'entry-unlocked' : 'entry-locked'}`;

      const statusIcon = isSolved ? '🔴' : isUnlocked ? '🟡' : '⚫';
      const clueText   = isSolved
        ? `<div class="dossier-entry-clue">${clue}</div>`
        : isUnlocked
          ? `<div class="dossier-entry-clue"><em>Location found — mystery awaits your deduction.</em></div>`
          : `<div class="dossier-entry-clue"><em>Visit this site to begin the investigation.</em></div>`;

      div.innerHTML = `
        <div class="dossier-entry-header">
          <span class="dossier-entry-status">${statusIcon}</span>
          <span class="dossier-entry-name">${loc.name}</span>
        </div>
        ${clueText}
      `;

      div.addEventListener('click', () => {
        if (isSolved || isUnlocked) {
          closeDossier();
          openCaseFile(loc);
        }
      });

      entries.appendChild(div);
    });

    panel.classList.remove('hidden');
  }

  function closeDossier() {
    document.getElementById('dossier-panel').classList.add('hidden');
  }

  function updateDossierCount() {
    document.getElementById('dossier-count').textContent = Game.solvedCount();
  }

  // ---- Toasts and notifications ----

  let toastTimeout = null;

  function showToast(msg) {
    const toast = document.getElementById('proximity-toast');
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.add('hidden'), 3500);
  }

  function showProximityHint(distMeters) {
    showToast(`🔎 A mystery is nearby (${distMeters}m away)…`);
  }

  function showUnlockNotification(locationName) {
    showToast(`🗝 Location unlocked: ${locationName}! Tap the marker to begin.`);
  }

  // ---- Bootstrap ----

  function init() {
    document.getElementById('case-close').addEventListener('click', closeCaseFile);
    document.getElementById('dossier-btn').addEventListener('click', openDossier);
    document.getElementById('dossier-close').addEventListener('click', closeDossier);
    updateDossierCount();
    if (typeof Story !== 'undefined') Story.checkIntro();
  }

  return { init, openCaseFile, closeCaseFile, openDossier, closeDossier,
           showToast, showProximityHint, showUnlockNotification, updateDossierCount };
})();

// Bootstrap everything once the DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  await MapView.init();
  UI.init();
  GPS.start();
  UI.updateDossierCount();
  if (typeof PlayerGame !== 'undefined') PlayerGame.init();
});
