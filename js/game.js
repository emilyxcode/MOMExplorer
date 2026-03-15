/**
 * game.js — State management and localStorage persistence
 *
 * State shape:
 * {
 *   unlocked: Set<string>,  // location IDs the player has physically reached
 *   solved:   Set<string>,  // location IDs the player has correctly answered
 *   clues:    { [id]: string }  // solved_text collected per location
 * }
 */

const Game = (() => {
  const STORAGE_KEY = 'momexplorer_state';

  let state = {
    unlocked: new Set(),
    solved:   new Set(),
    clues:    {}
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      state.unlocked = new Set(parsed.unlocked || []);
      state.solved   = new Set(parsed.solved   || []);
      state.clues    = parsed.clues || {};
    } catch (e) {
      console.warn('MOMExplorer: could not load saved state', e);
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        unlocked: [...state.unlocked],
        solved:   [...state.solved],
        clues:    state.clues
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

  function isUnlocked(id) { return state.unlocked.has(id); }
  function isSolved(id)   { return state.solved.has(id);   }
  function getClue(id)    { return state.clues[id] || null; }
  function solvedCount()  { return state.solved.size; }

  function getAll() { return state; }

  return { load, unlock, solve, isUnlocked, isSolved, getClue, solvedCount, getAll };
})();
