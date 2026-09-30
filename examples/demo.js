import { SongCatalog } from '../src/song-catalog.js';

const catalog = new SongCatalog();
const song = catalog.create({
  title: 'World is Mine',
  vocaloid: 'Hatsune Miku',
  producer: 'ryo',
  durationSeconds: 255,
});
console.log('Create:', song);
console.log('Read por ID:', catalog.get(song.id));
console.log('Read listado:', catalog.list());
console.log('Update:', catalog.update(song.id, { title: 'ワールドイズマイン' }));
console.log('Delete:', catalog.delete(song.id));
console.log('Read después de eliminar:', catalog.get(song.id));
console.log('Listado final:', catalog.list());
