import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { SongCatalog } from '../src/song-catalog.js';
import { songArbitrary, options } from './helpers.js';

test('Delete: elimina solo la canción seleccionada y repetir no cambia el estado', () => {
  fc.assert(fc.property(fc.array(songArbitrary, { minLength: 1, maxLength: 30 }), fc.nat(), (songs, index) => {
    const catalog = new SongCatalog();
    const before = songs.map((song) => catalog.create(song));
    const target = before[index % before.length];
    const expected = before.filter((song) => song.id !== target.id);
    assert.equal(catalog.delete(target.id), true);
    assert.equal(catalog.get(target.id), null);
    assert.deepEqual(catalog.list(), expected);
    assert.equal(catalog.delete(target.id), false);
    assert.deepEqual(catalog.list(), expected);
    const next = catalog.create(songs[0]);
    assert.ok(next.id > Math.max(...before.map((song) => song.id)));
  }), options);
});

test('Delete: eliminar un ID inexistente no modifica el catálogo', () => {
  fc.assert(fc.property(fc.array(songArbitrary, { maxLength: 30 }), (songs) => {
    const catalog = new SongCatalog();
    const before = songs.map((song) => catalog.create(song));
    assert.equal(catalog.delete(before.length + 1), false);
    assert.deepEqual(catalog.list(), before);
  }), options);
});
