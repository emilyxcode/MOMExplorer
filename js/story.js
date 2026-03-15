/**
 * story.js — Title screen, chapter reveals, and finale
 *
 * Story: "The Vanished Chronicler"
 * Holmes sends the player to retrace the steps of Dr. Elias Farrow,
 * a Victorian antiquarian who disappeared in 1887 after claiming to
 * have discovered a secret woven through Monmouth County's history.
 */

const Story = (() => {
  const NAME_KEY       = 'momexplorer_name';
  const POS_KEY        = 'momexplorer_pos';
  const STATE_KEY      = 'momexplorer_state';
  const INTRO_SEEN_KEY = 'momexplorer_intro_seen';

  // Fetch story content from data file; resolves before checkIntro() is ever called
  let storyData = null;
  fetch('data/story.json')
    .then(r => r.json())
    .then(d => { storyData = d; })
    .catch(() => { storyData = { intro: [], finale_conclusion: '' }; });

  // ---- Typewriter ----

  function typewriterLines(lines, el, speed = 22) {
    let lineIdx  = 0;
    let charIdx  = 0;
    let fullText = '';

    function tick() {
      const line = lines[lineIdx];
      if (charIdx < line.length) {
        fullText += line[charIdx];
        el.innerHTML = fullText.replace(/\n/g, '<br>') + '<span class="cursor"></span>';
        charIdx++;
        setTimeout(tick, speed);
      } else {
        fullText += '\n\n';
        charIdx = 0;
        lineIdx++;
        if (lineIdx < lines.length) {
          setTimeout(tick, 280);
        } else {
          el.innerHTML = fullText.replace(/\n/g, '<br>');
        }
      }
    }
    tick();
  }

  // ---- Title screen (shown on every load) ----

  function checkIntro() {
    const modal    = document.getElementById('intro-modal');
    const textEl   = document.getElementById('intro-text');
    const nameInput = document.getElementById('name-input');
    const newBtn   = document.getElementById('intro-new');
    const loadBtn  = document.getElementById('intro-load');

    // Pre-fill name if saved
    const savedName = localStorage.getItem(NAME_KEY);
    if (savedName) nameInput.value = savedName;

    // Show Load Game only if a save exists
    const hasSave = !!localStorage.getItem(POS_KEY) ||
      (() => { try { const s = JSON.parse(localStorage.getItem(STATE_KEY) || '{}'); return (s.solved || []).length > 0 || (s.unlocked || []).length > 0; } catch { return false; } })();
    if (hasSave) loadBtn.classList.remove('hidden');

    // Update title from data if available
    const titleEl = document.getElementById('intro-title');
    if (storyData?.title) titleEl.textContent = storyData.title;

    // Show modal — play typewriter only on first ever visit
    modal.classList.remove('hidden');
    if (!localStorage.getItem(INTRO_SEEN_KEY)) {
      typewriterLines(storyData?.intro || [], textEl);
    } else {
      textEl.innerHTML = (storyData?.intro || []).join('<br><br>');
    }

    function getName() {
      const name = nameInput.value.trim();
      if (name) localStorage.setItem(NAME_KEY, name);
      return name || 'Detective';
    }

    function dismissModal(name) {
      updateHudName(name);
      modal.classList.add('fade-out');
      setTimeout(() => modal.classList.add('hidden'), 650);
    }

    // Allow Enter key to trigger New Game
    nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') newBtn.click();
    });

    newBtn.addEventListener('click', () => {
      const name = getName();
      localStorage.removeItem(STATE_KEY);
      localStorage.removeItem(POS_KEY);
      localStorage.setItem(NAME_KEY, name);
      localStorage.setItem(INTRO_SEEN_KEY, '1');
      location.reload();
    }, { once: true });

    loadBtn.addEventListener('click', () => {
      localStorage.setItem(INTRO_SEEN_KEY, '1');
      dismissModal(getName());
    }, { once: true });
  }

  function updateHudName(name) {
    const el = document.getElementById('hud-title');
    if (el) el.textContent = `🔍 Detective ${name}`;
  }

  // ---- Chapter banner ----

  let chapterTimeout = null;

  function showChapter(loc) {
    const banner  = document.getElementById('chapter-banner');
    const textEl  = document.getElementById('chapter-text');
    const dismiss = document.getElementById('chapter-dismiss');

    textEl.textContent = loc.chapter || '';
    banner.classList.remove('hidden');
    requestAnimationFrame(() => banner.classList.add('visible'));

    clearTimeout(chapterTimeout);

    function hide() {
      banner.classList.remove('visible');
      setTimeout(() => banner.classList.add('hidden'), 420);
      dismiss.removeEventListener('click', hide);
    }

    dismiss.addEventListener('click', hide, { once: true });
    chapterTimeout = setTimeout(hide, 12000);
  }

  // ---- Finale ----

  function showFinale(locations) {
    const modal        = document.getElementById('finale-modal');
    const chaptersEl   = document.getElementById('finale-chapters');
    const conclusionEl = document.getElementById('finale-conclusion');

    chaptersEl.innerHTML = '';

    locations.forEach(loc => {
      if (!loc.chapter) return;
      const div = document.createElement('div');
      div.className = 'finale-chapter';
      div.innerHTML = `
        <div class="finale-chapter-site">${loc.name}</div>
        <div class="finale-chapter-text">${loc.chapter}</div>
      `;
      chaptersEl.appendChild(div);
    });

    const conclusion = (storyData?.finale_conclusion || '').trim();
    conclusionEl.innerHTML = conclusion.replace(/\n/g, '<br>');

    modal.classList.remove('hidden');

    document.getElementById('finale-close').addEventListener('click', () => {
      modal.classList.add('hidden');
    }, { once: true });
  }

  // ---- Called by ui.js after a correct answer ----

  function onSolve(loc, allLocations) {
    showChapter(loc);
    if (Game.solvedCount() === allLocations.length) {
      setTimeout(() => {
        document.getElementById('chapter-banner').classList.add('hidden');
        showFinale(allLocations);
      }, 3500);
    }
  }

  return { checkIntro, onSolve, updateHudName };
})();
