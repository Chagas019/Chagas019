// Preferências locais do visitante. Tudo protegido por try/catch: modo privado
// ou armazenamento bloqueado não podem quebrar o app.
const FAV_KEY = 'aura:favorites';
const ONBOARD_KEY = 'aura:onboarded';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sem armazenamento: segue só na memória */
  }
}

const favorites = new Set(Array.isArray(read(FAV_KEY, [])) ? read(FAV_KEY, []) : []);
let onboarded = read(ONBOARD_KEY, false) === true;

export const store = {
  isFavorite: (id) => favorites.has(id),
  toggleFavorite(id) {
    if (favorites.has(id)) favorites.delete(id);
    else favorites.add(id);
    write(FAV_KEY, [...favorites]);
    return favorites.has(id);
  },
  favorites: () => [...favorites],
  isOnboarded: () => onboarded,
  setOnboarded() {
    onboarded = true;
    write(ONBOARD_KEY, true);
  },
};
