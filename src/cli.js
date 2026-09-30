import { createInterface } from 'node:readline';
import { SongCatalog } from './song-catalog.js';

const INPUT_ENDED = Symbol('input-ended');

function parseInteger(text) {
  const value = text.trim();
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new TypeError('Ingresa un número entero decimal, sin letras ni decimales.');
  }
  return Number(value);
}

/** Menú interactivo; también acepta líneas desde stdin para pruebas o scripts. */
export async function runCli({ input = process.stdin, output = process.stdout, catalog = new SongCatalog() } = {}) {
  const reader = createInterface({ input, output, terminal: Boolean(input.isTTY && output.isTTY) });
  const lines = reader[Symbol.asyncIterator]();
  const write = (text) => output.write(text);

  async function ask(prompt) {
    write(prompt);
    const { value, done } = await lines.next();
    if (done) throw INPUT_ENDED;
    return value;
  }

  function showSong(song) {
    write(`\nID: ${song.id}\nTítulo: ${song.title}\nVocaloid: ${song.vocaloid}\nProductor: ${song.producer}\nDuración: ${song.durationSeconds} segundos\n`);
  }

  try {
    write('Catálogo Vocaloid — los datos se guardan en memoria durante esta sesión.\n');
    while (true) {
      write('\n1. Crear canción\n2. Obtener por ID\n3. Listar canciones\n4. Actualizar canción\n5. Eliminar canción\n0. Salir\n');
      const option = (await ask('Elige una opción: ')).trim();
      try {
        switch (option) {
          case '1': {
            const data = {
              title: await ask('Título: '),
              vocaloid: await ask('Vocaloid: '),
              producer: await ask('Productor: '),
              durationSeconds: parseInteger(await ask('Duración en segundos (1–3600): ')),
            };
            const song = catalog.create(data);
            write('Canción creada.\n');
            showSong(song);
            break;
          }
          case '2': {
            const song = catalog.get(parseInteger(await ask('ID de la canción: ')));
            if (song) showSong(song);
            else write('No existe una canción con ese ID.\n');
            break;
          }
          case '3': {
            const songs = catalog.list();
            write(`Canciones en el catálogo: ${songs.length}\n`);
            songs.forEach(showSong);
            break;
          }
          case '4': {
            const id = parseInteger(await ask('ID de la canción a actualizar: '));
            const current = catalog.get(id);
            if (!current) {
              write('No existe una canción con ese ID.\n');
              break;
            }
            showSong(current);
            write('Deja un campo vacío para conservar su valor actual.\n');
            const patch = {};
            for (const [field, label] of [
              ['title', 'Nuevo título'], ['vocaloid', 'Nuevo Vocaloid'],
              ['producer', 'Nuevo productor'], ['durationSeconds', 'Nueva duración en segundos (1–3600)'],
            ]) {
              const value = await ask(`${label}: `);
              if (value !== '') patch[field] = field === 'durationSeconds' ? parseInteger(value) : value;
            }
            const updated = catalog.update(id, patch);
            write('Canción actualizada.\n');
            showSong(updated);
            break;
          }
          case '5': {
            const id = parseInteger(await ask('ID de la canción a eliminar: '));
            const song = catalog.get(id);
            if (!song) {
              write('No existe una canción con ese ID.\n');
              break;
            }
            showSong(song);
            const confirmation = (await ask('Confirmar eliminación (s/N): ')).trim().toLowerCase();
            if (confirmation === 's') {
              catalog.delete(id);
              write('Canción eliminada.\n');
            } else {
              write('Eliminación cancelada.\n');
            }
            break;
          }
          case '0':
            write('Hasta luego.\n');
            return;
          default:
            write('Opción inválida. Inténtalo nuevamente.\n');
        }
      } catch (error) {
        if (!(error instanceof TypeError)) throw error;
        write(`Error: ${error.message}\n`);
      }
    }
  } catch (error) {
    if (error !== INPUT_ENDED) throw error;
    write('\nEntrada finalizada. Hasta luego.\n');
  } finally {
    reader.close();
  }
}
