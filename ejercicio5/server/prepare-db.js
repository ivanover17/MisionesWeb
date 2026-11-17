// json-server escribe en server/db.json cada vez que se crea o borra una reserva.
// Para no subir esos cambios a Git, el fichero de verdad es db.seed.json:
// si db.json no existe (o se pide --reset), se copia desde la semilla.
import { copyFileSync, existsSync } from 'node:fs';

const seed = new URL('./db.seed.json', import.meta.url);
const db = new URL('./db.json', import.meta.url);

if (process.argv.includes('--reset') || !existsSync(db)) {
  copyFileSync(seed, db);
  console.log('server/db.json creado a partir de db.seed.json');
}
