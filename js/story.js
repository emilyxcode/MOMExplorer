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

  // Default story data — fetch overrides if available (fallback for file:// or offline)
  let storyData = {
    title: "The Vanished Chronicler",
    intro: [
      "My dear detective —",
      "Dr. Elias Farrow was not a man given to fancy. For thirty years he catalogued the mundane — deeds, diaries, parish records — and drew no grand conclusions. That is what made his last letter so remarkable.",
      "He wrote that he had found a hidden thread running through Monmouth County's entire history. Eight places. Eight moments across two centuries. At each one, he claimed, a single ordinary person quietly prevented a catastrophe — or built something that quietly endured.",
      "He called it the 'quiet backbone.' He said the county's real history had never been written, because the people who made it had no interest in being remembered.",
      "Three days after that letter arrived, Farrow vanished. His notes were left behind. He has not been seen since.",
      "I have studied his notes. The thread is real. Each of his eight sites holds a mystery — a question about who was there, what they did, and why it mattered. Solve them all, and you will understand what Farrow understood.",
      "I suspect you will find, as he did, that history rarely belongs to the people history remembers.",
      "— Sherlock Holmes"
    ],
    finale_conclusion: "Holmes set down Farrow's completed journal and was quiet for a long moment.\n\n\"He was right, you know,\" he said at last. \"I spent decades looking for the extraordinary hidden behind the ordinary. Farrow found the opposite — the extraordinary hiding in plain sight, wearing the face of the ordinary.\"\n\nHe closed the cover.\n\n\"Every one of these people — Martin, Tennent, Mary Hays, the lighthouse keeper, the ironworkers, the judge, the signal operators — they were not remarkable people doing remarkable things. They were ordinary people who showed up when their moment arrived. That is the secret Dr. Farrow discovered. That is why he chose to stay.\"\n\nA long pause.\n\n\"I confess — I find I rather envy him.\"",
    finale_endings: {
      chose_to_stay: "Holmes set down Farrow's completed journal and was quiet for a long moment.\n\n\"He chose to stay,\" he said at last. Not a question — a conclusion.\n\n\"Every site points the same direction. He found what he was looking for: proof that ordinary people carry history on their backs without knowing it. He found his answer, and then he found he could not leave the place that had given it to him.\"\n\nHe closed the cover.\n\n\"He is alive, somewhere in this county. Living quietly, among the people whose history he spent his life trying to understand. I have sent no enquiries. I do not intend to.\"\n\nA long pause.\n\n\"I confess — I cannot say that was the wrong decision.\"\n\n— Sherlock Holmes",
      endangered: "Holmes set down Farrow's completed journal with unusual care.\n\n\"He was afraid,\" he said. \"The thread he found runs deeper than history. Someone else knew about it. Knew about it forty years before Farrow did — and that researcher also vanished.\"\n\nHe stood and moved to the window.\n\n\"Farrow is hiding. Not because he found an answer, but because he found a question someone does not want answered. I advise caution, Detective. If you have followed his path as carefully as I believe you have, you may have been noticed.\"\n\nA long pause.\n\n\"We must find him before whoever frightened him does.\"\n\n— Sherlock Holmes",
      found_and_fled: "Holmes read the final entry twice before speaking.\n\n\"Extraordinary,\" he said quietly. \"He didn't vanish because he was afraid. He vanished because staying would have forced him to tell someone.\"\n\nHe set the journal down.\n\n\"The 'quiet backbone' is not merely a historical pattern. It is an active thing. The thread connecting these eight sites is still being held — by people alive today, who want no chronicler watching. Farrow found them.\"\n\nA long pause.\n\n\"He disappeared to protect them. And, I suspect — to protect you from knowing too much.\"\n\n— Sherlock Holmes",
      unknown: "Holmes sat with the pages open before him for a very long time.\n\n\"You have assembled all the evidence,\" he said at last. \"And yet.\"\n\nHe closed the journal.\n\n\"There are three explanations, each supported by what you have gathered. In thirty years of detective work, I have learned that when the evidence supports multiple conclusions equally — and all of them are plausible — the most honest answer is also the simplest one.\"\n\nA long pause.\n\n\"We do not know. The greatest mystery is the one that has several answers, and all of them are true.\"\n\n— Sherlock Holmes"
    }
  };

  const _storyReady = fetch('data/story.json')
    .then(r => r.json())
    .then(d => { storyData = d; })
    .catch(() => { /* keep default storyData above */ });

  // ---- Typewriter ----

  function typewriterLines(lines, el, speed = 22, onDone = null) {
    if (!lines || lines.length === 0) { if (onDone) onDone(); return; }
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
          if (onDone) onDone();
        }
      }
    }
    tick();
  }

  // ---- Title screen (shown on every load) ----

  async function checkIntro() {
    await _storyReady;

    const modal      = document.getElementById('intro-modal');
    const nameInput  = document.getElementById('name-input');
    const beginBtn   = document.getElementById('intro-begin');
    const stepName   = document.getElementById('intro-step-name');
    const stepLetter = document.getElementById('intro-step-letter');
    const textEl     = document.getElementById('intro-text');
    const buttonsEl  = document.getElementById('intro-buttons');
    const newBtn     = document.getElementById('intro-new');
    const loadBtn    = document.getElementById('intro-load');

    // Pre-fill name if saved
    const savedName = localStorage.getItem(NAME_KEY);
    if (savedName) nameInput.value = savedName;

    // Update title from data
    const titleEl = document.getElementById('intro-title');
    if (storyData?.title) titleEl.textContent = storyData.title;

    // Show Load Game only if a save exists
    const hasSave = !!localStorage.getItem(POS_KEY) ||
      (() => { try { const s = JSON.parse(localStorage.getItem(STATE_KEY) || '{}'); return (s.solved || []).length > 0 || (s.unlocked || []).length > 0; } catch { return false; } })();
    if (hasSave) loadBtn.classList.remove('hidden');

    modal.classList.remove('hidden');

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

    // Step 1: Enter → Begin
    nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') beginBtn.click();
    });

    // Step 1 → Step 2: show the letter, then reveal action buttons
    beginBtn.addEventListener('click', () => {
      getName(); // save name immediately
      stepName.classList.add('hidden');
      stepLetter.classList.remove('hidden');

      const intro = storyData?.intro || [];
      if (!localStorage.getItem(INTRO_SEEN_KEY)) {
        // First visit — typewriter, buttons appear when done
        typewriterLines(intro, textEl, 22, () => {
          buttonsEl.classList.remove('hidden');
        });
      } else {
        // Returning — show text statically, buttons immediately
        textEl.innerHTML = intro.join('<br><br>');
        buttonsEl.classList.remove('hidden');
      }
    }, { once: true });

    newBtn.addEventListener('click', () => {
      const name = getName();
      localStorage.setItem(INTRO_SEEN_KEY, '1');
      Game.reset();
      MapView.resetAllMarkers();
      PlayerGame.resetToStart();
      UI.updateDossierCount();
      dismissModal(name);
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

  // ---- Finale — paginated journal ----

  function showFinale(locations) {
    const modal = document.getElementById('finale-modal');
    const inner = document.getElementById('finale-inner');
    inner.innerHTML = '';

    const detectiveName = localStorage.getItem(NAME_KEY) || 'Detective';
    const dominantTag   = Game.getDominantTag();
    const endings       = storyData?.finale_endings || {};
    const endingText    = endings[dominantTag] || endings['unknown'] || storyData?.finale_conclusion || '';

    const tagVerdict = {
      'chose_to_stay':  'He chose to stay.',
      'endangered':     'He was in danger.',
      'found_and_fled': 'He disappeared to protect it.',
      'unknown':        'The truth remains unknown.'
    };

    // Build page list
    const pages = [];
    pages.push({ type: 'cover', name: detectiveName });
    locations.forEach(loc => pages.push({ type: 'location', loc }));
    pages.push({ type: 'ending', text: endingText, verdict: tagVerdict[dominantTag] || '' });
    pages.push({ type: 'closed' });

    let currentPage = 0;

    // Navigation bar
    const nav = document.createElement('div');
    nav.id = 'journal-nav';

    const prevBtn = document.createElement('button');
    prevBtn.id = 'journal-prev';
    prevBtn.textContent = '◀ Prev';

    const counter = document.createElement('span');
    counter.id = 'journal-counter';

    const nextBtn = document.createElement('button');
    nextBtn.id = 'journal-next';
    nextBtn.textContent = 'Next ▶';

    nav.append(prevBtn, counter, nextBtn);

    const pageEl = document.createElement('div');
    pageEl.id = 'journal-page';

    const closeBtn = document.createElement('button');
    closeBtn.id = 'finale-close';
    closeBtn.textContent = 'Return to the Map';

    inner.append(nav, pageEl, closeBtn);

    function renderPage(idx) {
      const page = pages[idx];
      pageEl.innerHTML = '';
      counter.textContent = `Page ${idx + 1} of ${pages.length}`;
      prevBtn.disabled = idx === 0;
      nextBtn.disabled = idx === pages.length - 1;

      if (page.type === 'cover') {
        pageEl.innerHTML = `
          <div class="journal-cover">
            <div class="journal-cover-label">The Chronicle of</div>
            <div class="journal-cover-title">Dr. Elias Farrow</div>
            <div class="journal-cover-divider">— ✦ —</div>
            <div class="journal-cover-detective">Investigated by Detective ${page.name}</div>
            <div class="journal-cover-date">Monmouth County, New Jersey</div>
          </div>
        `;
      } else if (page.type === 'location') {
        const { loc } = page;
        pageEl.innerHTML = `
          <div class="journal-loc-page">
            <div class="journal-loc-name">${loc.name}</div>
            <div class="journal-loc-clue">${loc.solved_text}</div>
            <div class="journal-loc-chapter">${loc.chapter || ''}</div>
          </div>
        `;
      } else if (page.type === 'ending') {
        pageEl.innerHTML = `
          <div class="journal-ending-page">
            <div class="journal-ending-label">Holmes's Conclusion</div>
            ${page.verdict ? `<div class="journal-ending-verdict">${page.verdict}</div>` : ''}
            <div class="journal-ending-text">${page.text.replace(/\n/g, '<br>')}</div>
          </div>
        `;
      } else if (page.type === 'closed') {
        pageEl.innerHTML = `
          <div class="journal-closed-page">
            <div class="journal-closed-stamp">CASE<br>CLOSED</div>
          </div>
        `;
        // Animate stamp in after a brief delay
        setTimeout(() => {
          const stamp = pageEl.querySelector('.journal-closed-stamp');
          if (stamp) stamp.classList.add('stamp-animate');
        }, 200);
      }
    }

    prevBtn.addEventListener('click', () => {
      if (currentPage > 0) { currentPage--; renderPage(currentPage); }
    });
    nextBtn.addEventListener('click', () => {
      if (currentPage < pages.length - 1) { currentPage++; renderPage(currentPage); }
    });

    // Arrow key navigation (removed when modal closes)
    function journalKeyHandler(e) {
      if (modal.classList.contains('hidden')) {
        document.removeEventListener('keydown', journalKeyHandler);
        return;
      }
      if (e.key === 'ArrowLeft' && currentPage > 0) { currentPage--; renderPage(currentPage); }
      if (e.key === 'ArrowRight' && currentPage < pages.length - 1) { currentPage++; renderPage(currentPage); }
    }
    document.addEventListener('keydown', journalKeyHandler);

    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
      document.removeEventListener('keydown', journalKeyHandler);
    }, { once: true });

    renderPage(0);
    modal.classList.remove('hidden');
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
