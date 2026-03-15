/**
 * game.js — State management and localStorage persistence
 *
 * State shape:
 * {
 *   unlocked: Set<string>,  // location IDs the player has physically reached
 *   solved:   Set<string>,  // location IDs the player has correctly answered
 *   clues:    { [id]: string },  // solved_text collected per location
 *   tags:     { [id]: string }   // Farrow interpretation tag per location
 * }
 */

const Game = (() => {
  const STORAGE_KEY = 'momexplorer_state';

  let state = {
    unlocked: new Set(),
    solved:   new Set(),
    clues:    {},
    tags:     {}
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      state.unlocked = new Set(parsed.unlocked || []);
      state.solved   = new Set(parsed.solved   || []);
      state.clues    = parsed.clues || {};
      state.tags     = parsed.tags  || {};
    } catch (e) {
      console.warn('MOMExplorer: could not load saved state', e);
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        unlocked: [...state.unlocked],
        solved:   [...state.solved],
        clues:    state.clues,
        tags:     state.tags
      }));
    } catch (e) {
      console.warn('MOMExplorer: could not save state', e);
    }
  }

  function unlock(id) {
    if (state.unlocked.has(id)) return false;
    state.unlocked.add(id);
    save();
    return true;
  }

  function solve(id, clueText) {
    if (state.solved.has(id)) return false;
    state.solved.add(id);
    state.clues[id] = clueText;
    save();
    return true;
  }

  function tag(id, value) {
    state.tags[id] = value;
    save();
  }

  function getTagCounts() {
    const counts = { endangered: 0, chose_to_stay: 0, found_and_fled: 0 };
    Object.values(state.tags).forEach(t => {
      if (counts[t] !== undefined) counts[t]++;
    });
    return counts;
  }

  function getDominantTag() {
    const counts = getTagCounts();
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total === 0) return 'unknown';
    const max = Math.max(...Object.values(counts));
    const dominants = Object.keys(counts).filter(k => counts[k] === max);
    return dominants.length > 1 ? 'unknown' : dominants[0];
  }

  function isUnlocked(id) { return state.unlocked.has(id); }
  function isSolved(id)   { return state.solved.has(id);   }
  function getClue(id)    { return state.clues[id] || null; }
  function getTag(id)     { return state.tags[id]  || null; }
  function solvedCount()  { return state.solved.size; }

  function reset() {
    state = { unlocked: new Set(), solved: new Set(), clues: {}, tags: {} };
    localStorage.removeItem(STORAGE_KEY);
  }

  function getAll() { return state; }

  return { load, reset, unlock, solve, tag, isUnlocked, isSolved, getClue, getTag,
           solvedCount, getTagCounts, getDominantTag, getAll };
})();
