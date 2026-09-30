import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { SongCatalog } from '../src/song-catalog.js';
import { songArbitrary, options } from './helpers.js';

test('Read: obtener y listar devuelve exactamente lo creado sin modificar el catálogo', () => {
  fc.assert(fc.property(fc.array(songArbitrary, { maxLength: 30 }), (songs) => {
    const catalog = new SongCatalog();
    const expected = songs.map((song) => catalog.create(song));
    assert.deepEqual(catalog.list(), expected);
    for (const song of expected) assert.deepEqual(catalog.get(song.id), song);
    assert.equal(catalog.get(expected.length + 1), null);
    assert.deepEqual(catalog.list(), expected);
  }), options);
});

test('Read: modificar entradas y resultados no altera el estado interno', () => {
  fc.assert(fc.property(songArbitrary, (data) => {
    const catalog = new SongCatalog();
    const input = { ...data };
    const created = catalog.create(input);
    const expected = { ...data, id: created.id };
    input.title = 'entrada alterada';
    created.title = 'resultado alterado';
    const read = catalog.get(expected.id);
    read.title = 'lectura alterada';
    const listed = catalog.list();
    listed[0].title = 'listado alterado';
    listed.pop();
    assert.deepEqual(catalog.get(expected.id), expected);
    assert.deepEqual(catalog.list(), [expected]);
  }), options);
});
