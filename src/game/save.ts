import { DEFAULT_SAVE, SaveData } from './types';
import { STORAGE_KEY } from './constants';

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SAVE, ...parsed };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage not available — game still works
  }
}

export function resetSave(): SaveData {
  const fresh = { ...DEFAULT_SAVE };
  writeSave(fresh);
  return fresh;
}
