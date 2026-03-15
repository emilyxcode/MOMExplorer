/**
 * story.js — Intro screen, chapter reveals, and finale
 *
 * Story: "The Vanished Chronicler"
 * Holmes sends the player to retrace the steps of Dr. Elias Farrow,
 * a Victorian antiquarian who disappeared in 1887 after claiming to
 * have discovered a secret woven through Monmouth County's history.
 */

const Story = (() => {
  const INTRO_SEEN_KEY = 'momexplorer_intro_seen';

  const INTRO_LINES = [
    'My dear detective —',
    'I write to you from Baker Street with a matter of some urgency.',
    'In the autumn of 1887, a scholar named Dr. Elias Farrow vanished without a trace — shortly after sending me a letter claiming to have uncovered something extraordinary hidden across Monmouth County, New Jersey.',
    'His last letter spoke of eight places, each holding a fragment of a secret that connects the county\'s entire history.',
    'I am too old for the journey myself. I need you to walk in his footsteps — and discover what he found.',
    '— Sherlock Holmes'
  ];

  const FINALE_CONCLUSION = `
    Holmes set down Farrow's completed journal and was quiet for a long moment.
    "He was right, you know," he said at last. "I spent decades looking for the extraordinary hidden behind the ordinary. Farrow found the opposite — the extraordinary hiding in plain sight, wearing the face of the ordinary."
    He closed the cover.
    "Every one of these people — Martin, Tennent, Mary Hays, the lighthouse keeper, the ironworkers, the judge, the signal operators — they were not remarkable people doing remarkable things. They were ordinary people who showed up when their moment arrived. That is the secret Dr. Farrow discovered. That is why he chose to stay."
    A long pause.
    "I confess — I find I rather envy him."
  `;

  // ---- Typewriter intro ----

  function typewriterLines(lines, el, onDone, speed = 28) {
    let lineIdx  = 0;
    let charIdx  = 0;
    let fullText = '';

    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    el.appendChild(cursor);

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
          setTimeout(tick, 320);
        } else {
          el.innerHTML = fullText.replace(/\n/g, '<br>');
          onDone();
        }
      }
    }
    tick();
  }

  function checkIntro() {
    if (localStorage.getItem(INTRO_SEEN_KEY)) return;

    const modal   = document.getElementById('intro-modal');
    const textEl  = document.getElementById('intro-text');
    const startBtn = document.getElementById('intro-start');

    modal.style.display = 'flex';

    typewriterLines(INTRO_LINES, textEl, () => {
      startBtn.classList.add('visible');
    });

    startBtn.addEventListener('click', () => {
      localStorage.setItem(INTRO_SEEN_KEY, '1');
      modal.classList.add('fade-out');
      setTimeout(() => { modal.style.display = 'none'; }, 650);
    }, { once: true });
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
    chapterTimeout = setTimeout(hide, 12000); // auto-dismiss after 12s
  }

  // ---- Finale ----

  function showFinale(locations) {
    const modal       = document.getElementById('finale-modal');
    const chaptersEl  = document.getElementById('finale-chapters');
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

    conclusionEl.innerHTML = FINALE_CONCLUSION.trim().replace(/\n\s+/g, '<br><br>');

    modal.classList.remove('hidden');

    document.getElementById('finale-close').addEventListener('click', () => {
      modal.classList.add('hidden');
    }, { once: true });
  }

  // ---- Called by ui.js after a correct answer ----

  function onSolve(loc, allLocations) {
    showChapter(loc);
    if (Game.solvedCount() === allLocations.length) {
      // Brief delay so chapter banner shows first
      setTimeout(() => {
        document.getElementById('chapter-banner').classList.add('hidden');
        showFinale(allLocations);
      }, 3500);
    }
  }

  return { checkIntro, onSolve };
})();
