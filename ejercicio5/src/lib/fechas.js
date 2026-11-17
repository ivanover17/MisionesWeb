// Ayudas para trabajar con las fechas "AAAA-MM-DD" que devuelve <input type="date">.
// Se comparan como texto en hora local: así no hay sorpresas con la zona horaria.

const dosCifras = (n) => String(n).padStart(2, '0');

export function aISO(fecha) {
  return `${fecha.getFullYear()}-${dosCifras(fecha.getMonth() + 1)}-${dosCifras(fecha.getDate())}`;
}

export function hoyISO() {
  return aISO(new Date());
}

export function sumarDias(iso, dias) {
  const [a, m, d] = iso.split('-').map(Number);
  return aISO(new Date(a, m - 1, d + dias));
}

// 0 = domingo, 1 = lunes, ... (igual que Date#getDay)
export function diaDeLaSemana(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d).getDay();
}

export function fechaLegible(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  const texto = new Date(a, m - 1, d).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return texto; // «sábado, 5 de diciembre»
}
