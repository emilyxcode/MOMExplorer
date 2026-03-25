/**
 * story.js — Title screen, chapter reveals, and finale
 *
 * Story 1: "The Vanished Chronicler"
 * Story 2: "The Edited County"
 */

const Story = (() => {
  const NAME_KEY        = 'momexplorer_name';
  const POS_KEY         = 'momexplorer_pos';
  const STATE_KEY       = 'momexplorer_state';
  const INTRO_SEEN_KEY  = 'momexplorer_intro_seen';
  const STORY_KEY       = 'momexplorer_story';

  let currentStory = parseInt(localStorage.getItem(STORY_KEY), 10) || 1;

  // Default story data — fetch overrides if available
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
    finale_endings: {
      chose_to_stay: "Holmes set down Farrow's completed journal and was quiet for a long moment.\n\n\"He chose to stay,\" he said at last.\n\n\"Every site points the same direction. He found what he was looking for: proof that ordinary people carry history on their backs without knowing it. He found his answer, and then he found he could not leave the place that had given it to him.\"\n\n\"I confess — I cannot say that was the wrong decision.\"\n\n— Sherlock Holmes",
      endangered: "Holmes set down Farrow's completed journal with unusual care.\n\n\"He was afraid,\" he said. \"The thread he found runs deeper than history. Someone else knew about it — and that researcher also vanished.\"\n\n\"Farrow is hiding. If you have followed his path as carefully as I believe you have, you may have been noticed.\"\n\n\"We must find him before whoever frightened him does.\"\n\n— Sherlock Holmes",
      found_and_fled: "Holmes read the final entry twice before speaking.\n\n\"He didn't vanish because he was afraid. He vanished because staying would have forced him to tell someone.\"\n\n\"The 'quiet backbone' is an active thing. The thread is still being held — by people alive today. Farrow found them. He disappeared to protect them.\"\n\n— Sherlock Holmes",
      unknown: "Holmes sat with the pages open before him for a very long time.\n\n\"You have assembled all the evidence,\" he said at last. \"And yet.\"\n\n\"There are three explanations, each supported by what you have gathered. The greatest mystery is the one that has several answers, and all of them are true.\"\n\n— Sherlock Holmes"
    },
    story2_title: "The Edited County",
    story2_intro: [
      "Detective —",
      "Farrow has been found.",
      "He is living quietly in Shrewsbury Township, teaching school under an assumed name. He is not in danger. He chose to stay, as I suspected he had.",
      "He has sent me a second journal. Not a continuation of his first investigation — a parallel one. While he was cataloguing the 'quiet backbone,' he was also noticing something else: places where history had been deliberately simplified. Not falsified, as at the Spy House — but smoothed over. The awkward parts quietly removed.",
      "He calls it 'the edited county.'",
      "His second set of notes concerns five sites. Each one carries a history that people prefer to remember differently from how it actually occurred.",
      "I will not tell you what Farrow concluded about these places. I want you to find that for yourself.",
      "— Sherlock Holmes"
    ],
    story2_finale_endings: {
      chose_to_stay: "Holmes read the last entry of the second journal and turned it over in his hands for a long time.\n\n\"He found what he was looking for,\" he said. \"Every one of these five sites carries a story where the official account is not false — but incomplete. Where the omission is not conspiracy, but comfort.\"\n\n\"Farrow chose to stay. He chose not to publish. He chose to teach children the history that the monuments do not tell. That is the most honest thing he could do with what he had found.\"\n\n\"I believe it was the right choice.\"\n\n— Sherlock Holmes",
      endangered: "Holmes set the second journal down with deliberate care.\n\n\"He found too much. Not too much to understand — too much to ignore. The second thread leads somewhere it should not lead, if it is only about historical omission.\"\n\n\"Garfield. Bradley. Molly Pitcher. Keyport. Matawan. Together — if you follow the pattern of who benefits from the smoothing — they point toward something current.\"\n\n\"Farrow found it. I advise caution. Do not attempt to follow the second thread to its terminus.\"\n\n— Sherlock Holmes",
      found_and_fled: "Holmes studied the cover of the second journal for a long moment.\n\n\"He fled because of something specific. Not the pattern — he found something in the archive that connected these five sites in a way they should not be connected.\"\n\n\"Farrow is not hiding from history. He is hiding from the people who have decided that a particular piece of history should remain smoothed over.\"\n\n\"I am writing this quickly.\"\n\n— Sherlock Holmes",
      unknown: "Holmes sat with both journals open before him for a very long time.\n\n\"Two threads. One about what was built. One about what was edited. Both running through the same county, the same people, the same two centuries.\"\n\n\"Farrow found both threads and chose not to pull either one to its end. A county that can carry its difficult history alongside its comfortable one — that is a county that has achieved something rare.\"\n\n\"Whether Monmouth County has achieved that — I leave to you.\"\n\n— Sherlock Holmes"
    }
  };

  const _storyReady = fetch('data/story.json')
    .then(r => r.json())
    .then(d => { storyData = d; })
    .catch(() => { /* keep default storyData above */ });

  // ---- Typewriter ----

  function typewriterLines(lines, el, speed = 12, onDone = null) {
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
          setTimeout(tick, 120);
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

    nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') beginBtn.click();
    });

    beginBtn.addEventListener('click', () => {
      getName();
      stepName.classList.add('hidden');
      stepLetter.classList.remove('hidden');

      const intro = storyData?.intro || [];
      if (!localStorage.getItem(INTRO_SEEN_KEY)) {
        typewriterLines(intro, textEl, 12, () => {
          buttonsEl.classList.remove('hidden');
        });
      } else {
        textEl.innerHTML = intro.join('<br><br>');
        buttonsEl.classList.remove('hidden');
      }
    }, { once: true });

    newBtn.addEventListener('click', () => {
      const name = getName();
      localStorage.setItem(INTRO_SEEN_KEY, '1');
      localStorage.setItem(NAME_KEY, name || 'Detective');
      localStorage.removeItem(STORY_KEY);
      currentStory = 1;
      Game.reset();
      // Reload page cleanly to restore story 1 locations if we were in story 2
      window.location.reload();
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

  // ---- Story 2 intro ----

  async function showStory2Intro() {
    await _storyReady;

    const modal   = document.getElementById('story2-modal');
    const titleEl = document.getElementById('story2-title');
    const textEl  = document.getElementById('story2-text');
    const beginBtn = document.getElementById('story2-begin');

    if (storyData?.story2_title) titleEl.textContent = storyData.story2_title;

    const intro = storyData?.story2_intro || [];
    textEl.innerHTML = '';

    modal.classList.remove('hidden');

    // Typewriter for story 2 intro
    typewriterLines(intro, textEl, 12, () => {
      beginBtn.classList.remove('hidden');
    });

    beginBtn.classList.add('hidden');

    beginBtn.addEventListener('click', async () => {
      modal.classList.add('fade-out');
      setTimeout(() => modal.classList.add('hidden'), 650);

      currentStory = 2;
      localStorage.setItem(STORY_KEY, '2');

      // Load story 2 locations
      await MapView.loadNewStory('data/locations2.json');
      UI.updateDossierCount();

      UI.showToast('📖 Chapter II has begun. New locations await.');
    }, { once: true });
  }

  // ---- Finale — paginated journal ----

  function showFinale(locations, onClose) {
    const modal = document.getElementById('finale-modal');
    const inner = document.getElementById('finale-inner');
    inner.innerHTML = '';

    const detectiveName = localStorage.getItem(NAME_KEY) || 'Detective';
    const dominantTag   = Game.getDominantTag();
    const isStory2      = currentStory === 2;

    const endings     = isStory2
      ? (storyData?.story2_finale_endings || {})
      : (storyData?.finale_endings || {});
    const defaultText = isStory2
      ? (storyData?.story2_finale_conclusion || storyData?.story2_finale_endings?.unknown || '')
      : (storyData?.finale_conclusion || storyData?.finale_endings?.unknown || '');
    const endingText  = endings[dominantTag] || endings['unknown'] || defaultText;

    const coverTitle = isStory2 ? "Dr. Farrow's Second Journal" : "The Chronicle of Dr. Elias Farrow";

    const tagVerdict = {
      'chose_to_stay':  'He chose to stay.',
      'endangered':     'He was in danger.',
      'found_and_fled': 'He disappeared to protect it.',
      'unknown':        'The truth remains unknown.'
    };

    // Build page list
    const pages = [];
    pages.push({ type: 'cover', name: detectiveName, title: coverTitle });
    locations.forEach(loc => pages.push({ type: 'location', loc }));
    pages.push({ type: 'ending', text: endingText, verdict: tagVerdict[dominantTag] || '' });
    pages.push({ type: 'closed' });

    let currentPage = 0;

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

    const closeLabel = isStory2 ? 'Return to the Map' : 'Continue →';
    const closeBtn = document.createElement('button');
    closeBtn.id = 'finale-close';
    closeBtn.textContent = closeLabel;

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
            <div class="journal-cover-title">${page.title}</div>
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
      if (onClose) onClose();
    }, { once: true });

    renderPage(0);
    modal.classList.remove('hidden');
  }

  // ---- Called by ui.js after a correct answer ----

  function onSolve(loc, allLocations) {
    showChapter(loc);
    const solvedInStory = allLocations.filter(l => Game.isSolved(l.id)).length;
    if (solvedInStory === allLocations.length) {
      setTimeout(() => {
        document.getElementById('chapter-banner').classList.add('hidden');
        const isStory2 = currentStory === 2;
        showFinale(allLocations, isStory2 ? null : showStory2Intro);
      }, 3500);
    }
  }

  function getCurrentStory() { return currentStory; }

  return { checkIntro, onSolve, updateHudName, getCurrentStory };
})();
