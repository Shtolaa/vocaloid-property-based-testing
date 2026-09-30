const FIELDS = ['title', 'vocaloid', 'producer', 'durationSeconds'];

function validateId(id) {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new TypeError('El ID debe ser un entero positivo seguro.');
  }
}

function validateData(data, partial = false) {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new TypeError('Los datos deben ser un objeto.');
  }
  for (const key of Reflect.ownKeys(data)) {
    if (!FIELDS.includes(key)) throw new TypeError(`Campo no permitido: ${String(key)}`);
  }
  for (const field of FIELDS) {
    if (partial && !Object.hasOwn(data, field)) continue;
    const value = Object.hasOwn(data, field) ? data[field] : undefined;
    if (field === 'durationSeconds') {
      if (!Number.isInteger(value) || value < 1 || value > 3600) {
        throw new TypeError('La duración debe ser un entero entre 1 y 3600 segundos.');
      }
    } else if (typeof value !== 'string' || !value.trim() || value.length > 100) {
      throw new TypeError(`${field} debe ser texto no vacío de hasta 100 unidades UTF-16.`);
    }
  }
}

/** Catálogo en memoria. Las copias impiden modificar el estado fuera del CRUD. */
export class SongCatalog {
  #songs = new Map();
  #nextId = 1;

  get(id) {
    validateId(id);
    const song = this.#songs.get(id);
    return song ? { ...song } : null;
  }

  list() {
    return [...this.#songs.values()].map((song) => ({ ...song }));
  }

  delete(id) {
    validateId(id);
    return this.#songs.delete(id);
  }

  update(id, patch) {
    validateId(id);
    validateData(patch, true);
    const current = this.#songs.get(id);
    if (!current) return null;
    const updated = { ...current, ...patch, id };
    this.#songs.set(id, updated);
    return { ...updated };
  }

  create(data) {
    validateData(data);
    const song = { ...data, id: this.#nextId++ };
    this.#songs.set(song.id, song);
    return { ...song };
  }
}
