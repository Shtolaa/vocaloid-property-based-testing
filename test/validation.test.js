import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { SongCatalog } from '../src/song-catalog.js';
import { songArbitrary, options } from './helpers.js';

const invalidField = fc.oneof(
  fc.constantFrom('', ' ', '\t\n', null, undefined, 42, true).map((title) => ({ title })),
  fc.string({ minLength: 101, maxLength: 150 }).map((producer) => ({ producer })),
  fc.constantFrom('', null, false).map((vocaloid) => ({ vocaloid })),
  fc.oneof(fc.integer({ max: 0 }), fc.integer({ min: 3601 }), fc.constantFrom(1.5, NaN, Infinity, '180', null))
    .map((durationSeconds) => ({ durationSeconds })),
);

test('Validación: datos inválidos son rechazados sin alterar canciones ni consumir IDs', () => {
  fc.assert(fc.property(songArbitrary, invalidField, (valid, invalid) => {
    const catalog = new SongCatalog();
    const song = catalog.create(valid);
    assert.throws(() => catalog.create({ ...valid, ...invalid }), TypeError);
    assert.throws(() => catalog.update(song.id, invalid), TypeError);
    assert.deepEqual(catalog.list(), [song]);
    assert.equal(catalog.create(valid).id, song.id + 1);
  }), options);
});

test('Validación: rechaza estructuras inválidas, campos desconocidos y cambios del ID', () => {
  fc.assert(fc.property(songArbitrary, fc.integer({ min: 1 }), (valid, id) => {
    const catalog = new SongCatalog();
    const song = catalog.create(valid);
    for (const invalid of [null, undefined, [], 'Miku', 42, {}, { ...valid, extra: 'x' }, { ...valid, id }]) {
      assert.throws(() => catalog.create(invalid), TypeError);
    }
    for (const patch of [null, undefined, [], 'Miku', { id }, { extra: 'x' }, { title: undefined }]) {
      assert.throws(() => catalog.update(song.id, patch), TypeError);
    }
    assert.deepEqual(catalog.update(song.id, {}), song);
    assert.deepEqual(catalog.list(), [song]);
  }), options);
});

test('Validación: IDs inválidos se rechazan en Read, Update y Delete sin cambiar el catálogo', () => {
  fc.assert(fc.property(songArbitrary, fc.constantFrom(0, -1, 1.5, NaN, Infinity, '1', null, undefined), (valid, id) => {
    const catalog = new SongCatalog();
    const song = catalog.create(valid);
    assert.throws(() => catalog.get(id), TypeError);
    assert.throws(() => catalog.update(id, valid), TypeError);
    assert.throws(() => catalog.delete(id), TypeError);
    assert.deepEqual(catalog.list(), [song]);
  }), options);
});

test('Dominio: acepta límites de duración y nombres japoneses sin normalizar los textos', () => {
  const catalog = new SongCatalog();
  for (const durationSeconds of [1, 3600]) {
    const input = { title: ' 千本桜 ', vocaloid: '初音ミク', producer: '黒うさP', durationSeconds };
    const song = catalog.create(input);
    assert.deepEqual(catalog.get(song.id), { ...input, id: song.id });
  }
});
