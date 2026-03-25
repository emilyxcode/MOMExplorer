/**
 * ui.js — All UI interactions: Case File panel, Dossier, toasts, notifications
 */

const UI = (() => {
  // ---- Case File panel ----

  function openCaseFile(loc) {
    const panel     = document.getElementById('case-panel');
    const title     = document.getElementById('case-title');
    const witness   = document.getElementById('case-witness');
    const farrowNotes = document.getElementById('case-farrow-notes');
    const section   = document.getElementById('case-mystery-section');

    // Static header content
    title.textContent = loc.name;

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

    // Dynamic section content
    if (Game.isSolved(loc.id)) {
      renderSolved(loc, section);
    } else {
      renderExamStart(loc, section);
    }

    panel.classList.remove('hidden');
    requestAnimationFrame(() => panel.classList.add('visible'));
  }

  function renderSolved(loc, section) {
    section.innerHTML = '';
    const clue = Game.getClue(loc.id);
    const result = document.createElement('div');
    result.className = 'exam-result result-solved';
    result.textContent = `🔎 ${clue}`;
    section.appendChild(result);

    // If they solved but never chose an interpretation, offer it now
    if (loc.examination && loc.examination.farrow_options && !Game.getTag(loc.id)) {
      renderInterpretation(loc, section);
    }
  }

  function renderExamStart(loc, section) {
    section.innerHTML = '';

    // Fallback: no examination data → go straight to deduction
    if (!loc.examination) {
      renderDeduction(loc, section);
      return;
    }

    const claim = document.createElement('div');
    claim.className = 'exam-claim';
    claim.textContent = loc.examination.claim;

    const btn = document.createElement('button');
    btn.className = 'exam-begin-btn';
    btn.textContent = '🔍 Begin Cross-Examination';
    btn.addEventListener('click', () => renderExamChallenge(loc, section));

    section.append(claim, btn);
  }

  function renderExamChallenge(loc, section) {
    section.innerHTML = '';

    const claim = document.createElement('div');
    claim.className = 'exam-claim';
    claim.textContent = loc.examination.claim;

    const label = document.createElement('div');
    label.className = 'exam-challenge-label';
    label.textContent = 'How do you respond?';

    const opts = document.createElement('div');
    opts.className = 'exam-options';

    loc.examination.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'exam-opt';
      btn.textContent = opt.label;
      btn.addEventListener('click', () => renderExamResponse(loc, idx, section));
      opts.appendChild(btn);
    });

    section.append(claim, label, opts);
  }

  function renderExamResponse(loc, optIdx, section) {
    section.innerHTML = '';
    const chosen = loc.examination.options[optIdx];

    const claim = document.createElement('div');
    claim.className = 'exam-claim';
    claim.textContent = loc.examination.claim;

    const chosenLabel = document.createElement('div');
    chosenLabel.className = 'exam-opt-chosen';
    chosenLabel.textContent = `"${chosen.label}"`;

    const resp = document.createElement('div');
    resp.className = 'exam-response';
    resp.textContent = chosen.response;

    section.append(claim, chosenLabel, resp);

    // If there's a follow-up, show it instead of jumping straight to deduction
    if (loc.examination.follow_up) {
      renderExamFollowUp(loc, section);
    } else {
      const btn = document.createElement('button');
      btn.className = 'exam-proceed-btn';
      btn.textContent = 'Make your deduction →';
      btn.addEventListener('click', () => renderDeduction(loc, section));
      section.appendChild(btn);
    }
  }

  function renderExamFollowUp(loc, section) {
    const fu = loc.examination.follow_up;

    const prompt = document.createElement('div');
    prompt.className = 'exam-followup-prompt';
    prompt.textContent = fu.prompt;

    const opts = document.createElement('div');
    opts.className = 'exam-options';

    fu.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'exam-opt';
      btn.textContent = opt.label;
      btn.addEventListener('click', () => renderExamFollowUpResponse(loc, idx, section));
      opts.appendChild(btn);
    });

    section.append(prompt, opts);
  }

  function renderExamFollowUpResponse(loc, fuIdx, section) {
    // Keep everything already shown; replace only the follow-up part
    const prompt = section.querySelector('.exam-followup-prompt');
    const opts    = prompt ? prompt.nextElementSibling : null;

    if (prompt) prompt.remove();
    if (opts && opts.classList.contains('exam-options')) opts.remove();

    const chosen = loc.examination.follow_up.options[fuIdx];

    const fuLabel = document.createElement('div');
    fuLabel.className = 'exam-opt-chosen';
    fuLabel.textContent = `"${chosen.label}"`;

    const fuResp = document.createElement('div');
    fuResp.className = 'exam-response';
    fuResp.textContent = chosen.response;

    const btn = document.createElement('button');
    btn.className = 'exam-proceed-btn';
    btn.textContent = 'Make your deduction →';
    btn.addEventListener('click', () => renderDeduction(loc, section));

    section.append(fuLabel, fuResp, btn);
  }

  function renderDeduction(loc, section) {
    section.innerHTML = '';

    const mystery = document.createElement('p');
    mystery.className = 'exam-mystery';
    mystery.textContent = loc.mystery;

    const choices = document.createElement('div');
    choices.className = 'exam-choices';

    const result = document.createElement('div');
    result.className = 'exam-result hidden';

    loc.choices.forEach((text, idx) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = text;
      btn.addEventListener('click', () => handleAnswer(loc, idx, choices, result, section));
      choices.appendChild(btn);
    });

    section.append(mystery, choices, result);
  }

  function handleAnswer(loc, idx, choicesEl, resultEl, section) {
    const buttons = choicesEl.querySelectorAll('.choice-btn');
    buttons.forEach(b => b.disabled = true);

    if (idx === loc.answer) {
      buttons[idx].classList.add('correct');
      Game.solve(loc.id, loc.solved_text);
      MapView.updateMarker(loc.id);
      updateDossierCount();
      if (typeof Story !== 'undefined') Story.onSolve(loc, MapView.getLocations());

      resultEl.textContent = `✅ Elementary! ${loc.solved_text}`;
      resultEl.className   = 'exam-result result-correct';
    } else {
      buttons[idx].classList.add('wrong');
      buttons[loc.answer].classList.add('correct');
      resultEl.textContent = `🕵️ Not quite. The correct answer: "${loc.choices[loc.answer]}"`;
      resultEl.className   = 'exam-result result-wrong';
    }

    resultEl.classList.remove('hidden');

    // Interpretation prompt only after a correct answer
    if (idx === loc.answer && loc.examination && loc.examination.farrow_options) {
      setTimeout(() => renderInterpretation(loc, section), 900);
    }
  }

  function renderInterpretation(loc, section) {
    // Don't add a second prompt if one already exists
    if (section.querySelector('.exam-interpretation')) return;

    const interp = document.createElement('div');
    interp.className = 'exam-interpretation';

    const label = document.createElement('div');
    label.className = 'interp-label';
    label.textContent = '🕵 What does this site reveal about Farrow\'s disappearance?';

    const opts = document.createElement('div');
    opts.className = 'interp-opts';

    loc.examination.farrow_options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'interp-opt';
      btn.textContent = opt.text;
      btn.addEventListener('click', () => {
        Game.tag(loc.id, opt.tag);
        opts.querySelectorAll('.interp-opt').forEach(b => b.disabled = true);
        btn.classList.add('interp-opt-chosen');

        const confirm = document.createElement('div');
        confirm.className = 'interp-confirm';
        confirm.textContent = '— recorded in your dossier.';
        opts.after(confirm);
      }, { once: true });
      opts.appendChild(btn);
    });

    interp.append(label, opts);
    section.appendChild(interp);

    setTimeout(() => interp.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 120);
  }

  function closeCaseFile() {
    const panel = document.getElementById('case-panel');
    panel.classList.remove('visible');
    setTimeout(() => panel.classList.add('hidden'), 350);
  }

  // ---- Dossier ----

  function openDossier() {
    const panel     = document.getElementById('dossier-panel');
    const summary   = document.getElementById('dossier-summary');
    const entries   = document.getElementById('dossier-entries');
    const locations = MapView.getLocations();
    const solved    = Game.solvedCount();

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
    const locs = MapView.getLocations();
    const count = locs.filter(l => Game.isSolved(l.id)).length;
    document.getElementById('dossier-count').textContent = count;
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
  const storyNum = parseInt(localStorage.getItem('momexplorer_story'), 10) || 1;
  await MapView.init();
  if (storyNum === 2) {
    await MapView.loadNewStory('data/locations2.json');
  }
  UI.init();
  GPS.start();
  UI.updateDossierCount();
  if (typeof PlayerGame !== 'undefined') PlayerGame.init();
});
