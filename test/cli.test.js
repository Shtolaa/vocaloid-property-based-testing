import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const entry = fileURLToPath(new URL('../src/main.js', import.meta.url));
function runSession(lines) {
  const result = spawnSync(process.execPath, [entry], {
    input: lines.join('\n') + '\n', encoding: 'utf8', timeout: 5000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return result.stdout;
}

test('Terminal: permite crear, obtener y listar una canción desde el menú', () => {
  const output = runSession([
    '1', '千本桜', '初音ミク', '黒うさP', '240',
    '2', '1', '3', '0',
  ]);
  assert.match(output, /Canción creada/);
  assert.match(output, /ID: 1/);
  assert.match(output, /Título: 千本桜/);
  assert.match(output, /Vocaloid: 初音ミク/);
  assert.match(output, /Productor: 黒うさP/);
  assert.match(output, /Duración: 240 segundos/);
  assert.match(output, /Canciones en el catálogo: 1/);
  assert.match(output, /Hasta luego/);
});

test('Terminal: actualiza parcialmente y conserva los campos dejados en blanco', () => {
  const output = runSession([
    '1', 'Original', 'Miku', 'ryo', '255',
    '4', '1', 'Nuevo título', '', '', '300',
    '2', '1', '0',
  ]);
  assert.match(output, /Canción actualizada/);
  const after = output.slice(output.indexOf('Canción actualizada'));
  assert.match(after, /Título: Nuevo título/);
  assert.match(after, /Vocaloid: Miku/);
  assert.match(after, /Productor: ryo/);
  assert.match(after, /Duración: 300 segundos/);
  assert.doesNotMatch(after, /Título: Original/);
});

test('Terminal: actualizar un ID inexistente no solicita campos ni crea canciones', () => {
  const output = runSession(['4', '99', '3', '0']);
  assert.match(output, /No existe una canción con ese ID/);
  assert.match(output, /Canciones en el catálogo: 0/);
  assert.doesNotMatch(output, /Nuevo título/);
});

test('Terminal: solicita confirmación para eliminar y permite cancelar', () => {
  const output = runSession([
    '1', 'World is Mine', 'Miku', 'ryo', '255',
    '5', '1', 'n', '2', '1', '5', '1', 's', '2', '1', '3', '0',
  ]);
  assert.match(output, /Eliminación cancelada/);
  assert.match(output, /Canción eliminada/);
  const after = output.slice(output.indexOf('Canción eliminada'));
  assert.match(after, /No existe una canción con ese ID/);
  assert.match(after, /Canciones en el catálogo: 0/);
});

test('Terminal: eliminar un ID inexistente no pide confirmación', () => {
  const output = runSession(['5', '99', '0']);
  assert.match(output, /No existe una canción con ese ID/);
  assert.doesNotMatch(output, /Confirmar eliminación/);
});

test('Terminal: rechaza formatos numéricos ambiguos sin crear registros y permite continuar', () => {
  for (const duration of ['0x10', '1e2', '0b10', '1.5', '240s', 'Infinity', '', ' ', '0', '3601']) {
    const output = runSession(['1', 'Prueba', 'Miku', 'ryo', duration, '3', '0']);
    assert.match(output, /Error:/, `duración inválida: ${JSON.stringify(duration)}`);
    assert.match(output, /Canciones en el catálogo: 0/);
    assert.doesNotMatch(output, /Canción creada/);
    assert.match(output, /Hasta luego/);
  }
});

test('Terminal: rechaza IDs ambiguos y se recupera de opciones inválidas', () => {
  const output = runSession(['opción incorrecta', '2', '0x1', '2', '1e0', '3', '0']);
  assert.match(output, /Opción inválida/);
  assert.equal((output.match(/Error:/g) ?? []).length, 2);
  assert.match(output, /Canciones en el catálogo: 0/);
});

test('Terminal: actualización inválida es atómica y el menú sigue disponible', () => {
  const output = runSession([
    '1', 'Original', 'Miku', 'ryo', '255',
    '4', '1', 'No debe guardarse', '', '', '3601', '2', '1', '0',
  ]);
  assert.match(output, /Error:/);
  const after = output.slice(output.indexOf('Error:'));
  assert.match(after, /Título: Original/);
  assert.match(after, /Duración: 255 segundos/);
  assert.doesNotMatch(after, /Canción actualizada/);
});

test('Terminal: fin de entrada durante creación, actualización o confirmación no deja cambios parciales', () => {
  const output = runSession(['1', 'Incompleta']);
  assert.match(output, /Entrada finalizada/);
  assert.doesNotMatch(output, /Canción creada/);
  const update = runSession(['1', 'Original', 'Miku', 'ryo', '255', '4', '1', 'Cambio incompleto']);
  assert.match(update, /Entrada finalizada/);
  assert.doesNotMatch(update, /Canción actualizada/);
  const deletion = runSession(['1', 'Original', 'Miku', 'ryo', '255', '5', '1']);
  assert.match(deletion, /Entrada finalizada/);
  assert.doesNotMatch(deletion, /Canción eliminada/);
});
