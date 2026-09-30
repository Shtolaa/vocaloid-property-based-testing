import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { SongCatalog } from '../src/song-catalog.js';
import { songArbitrary, options } from './helpers.js';

const patchArbitrary = songArbitrary.chain((song) =>
  fc.subarray(Object.keys(song), { minLength: 1 }).map((keys) =>
    Object.fromEntries(keys.map((key) => [key, song[key]]))));

test('Update: aplica cambios parciales, conserva ID y no modifica otras canciones', () => {
  fc.assert(fc.property(
    fc.array(songArbitrary, { minLength: 1, maxLength: 25 }), patchArbitrary, fc.nat(),
    (songs, patch, index) => {
      const catalog = new SongCatalog();
      const before = songs.map((song) => catalog.create(song));
      const selected = index % before.length;
      const expected = before.map((song, i) => i === selected ? { ...song, ...patch } : song);
      const updated = catalog.update(before[selected].id, patch);
      assert.deepEqual(updated, expected[selected]);
      assert.deepEqual(catalog.list(), expected);
      updated.title = 'resultado alterado';
      patch.title = 'entrada alterada';
      assert.deepEqual(catalog.list(), expected);
    },
  ), options);
});

test('Update: actualizar un ID inexistente devuelve null sin crear una canción', () => {
  fc.assert(fc.property(songArbitrary, (data) => {
    const catalog = new SongCatalog();
    catalog.create(data);
    const before = catalog.list();
    assert.equal(catalog.update(2, data), null);
    assert.deepEqual(catalog.list(), before);
  }), options);
});
