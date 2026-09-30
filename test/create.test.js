import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { SongCatalog } from '../src/song-catalog.js';
import { songArbitrary, options } from './helpers.js';

test('Create: conserva los datos y asigna IDs positivos únicos incluso a canciones iguales', () => {
  fc.assert(fc.property(fc.array(songArbitrary, { minLength: 1, maxLength: 30 }), (songs) => {
    const catalog = new SongCatalog();
    const created = [...songs, songs[0]].map((song) => catalog.create(song));
    assert.equal(new Set(created.map((song) => song.id)).size, created.length);
    created.forEach(({ id, ...data }, index) => {
      assert.ok(Number.isSafeInteger(id) && id > 0);
      assert.deepEqual(data, { ...[...songs, songs[0]][index] });
    });
  }), options);
});
