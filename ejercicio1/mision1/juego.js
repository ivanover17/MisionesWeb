// =====================================================================
//  ESTADO DEL JUEGO
//  Todo lo que el juego necesita recordar está aquí arriba.
// =====================================================================

let tamano = 5;              // el tablero es de tamano × tamano

let encendido = [];          // encendido[fila][columna] -> true o false
let encendidoInicial = [];   // copia del tablero al empezar (para "Reiniciar")

let solucion = [];           // solucion[fila][columna] -> true si hay que pulsarlo
let solucionInicial = [];    // copia de la solución al empezar

let jugadas = [];            // lista de { fila, columna } que ha pulsado el jugador
let objetivo = 0;            // cuántas pulsaciones hacen falta al empezar
let terminado = false;


// =====================================================================
//  ELEMENTOS DE LA PÁGINA
// =====================================================================

const tablero = document.getElementById("tablero");
const textoMovimientos = document.getElementById("movimientos");
const textoObjetivo = document.getElementById("objetivo");
const textoEncendidos = document.getElementById("encendidos");
const mensaje = document.getElementById("mensaje");

const botonNuevo = document.getElementById("boton-nuevo");
const botonDeshacer = document.getElementById("boton-deshacer");
const botonReiniciar = document.getElementById("boton-reiniciar");
const botonPista = document.getElementById("boton-pista");
const selectorTamano = document.getElementById("selector-tamano");


// =====================================================================
//  FUNCIONES DE AYUDA
// =====================================================================

// Crea una cuadrícula tamano × tamano rellena con false.
function crearCuadricula() {
  const cuadricula = [];
  for (let fila = 0; fila < tamano; fila++) {
    const nuevaFila = [];
    for (let columna = 0; columna < tamano; columna++) {
      nuevaFila.push(false);
    }
    cuadricula.push(nuevaFila);
  }
  return cuadricula;
}

// Devuelve una copia independiente de una cuadrícula.
function copiarCuadricula(cuadricula) {
  return cuadricula.map(function (fila) {
    return fila.slice();
  });
}

// Cuenta cuántas casillas valen true.
function contarVerdaderos(cuadricula) {
  let total = 0;
  for (const fila of cuadricula) {
    for (const valor of fila) {
      if (valor) {
        total++;
      }
    }
  }
  return total;
}

// Número entero aleatorio entre 0 y maximo - 1.
function numeroAleatorio(maximo) {
  return Math.floor(Math.random() * maximo);
}


// =====================================================================
//  REGLAS DEL JUEGO
// =====================================================================

// Cambia un farol de encendido a apagado (o al revés),
// siempre que esté dentro del tablero.
function cambiarFarol(fila, columna) {
  const dentroDelTablero =
    fila >= 0 && fila < tamano && columna >= 0 && columna < tamano;

  if (dentroDelTablero) {
    encendido[fila][columna] = !encendido[fila][columna];
  }
}

// Pulsar un farol cambia ese farol y sus cuatro vecinos.
// Además lo marcamos/desmarcamos en la solución:
// pulsar dos veces el mismo farol es como no pulsarlo.
function pulsar(fila, columna) {
  cambiarFarol(fila, columna);      // el propio farol
  cambiarFarol(fila - 1, columna);  // el de arriba
  cambiarFarol(fila + 1, columna);  // el de abajo
  cambiarFarol(fila, columna - 1);  // el de la izquierda
  cambiarFarol(fila, columna + 1);  // el de la derecha

  solucion[fila][columna] = !solucion[fila][columna];
}

// Un puzle se crea partiendo de todo apagado y pulsando faroles al azar.
// Así sabemos que siempre tiene solución: repetir esas mismas pulsaciones.
function crearPuzle() {
  encendido = crearCuadricula();
  solucion = crearCuadricula();

  const pulsaciones = tamano + 2;
  for (let i = 0; i < pulsaciones; i++) {
    pulsar(numeroAleatorio(tamano), numeroAleatorio(tamano));
  }

  // Si por casualidad todo ha quedado apagado, lo intentamos otra vez.
  if (contarVerdaderos(encendido) === 0) {
    crearPuzle();
  }
}

function todoApagado() {
  return contarVerdaderos(encendido) === 0;
}


// =====================================================================
//  DIBUJAR EN PANTALLA
// =====================================================================

// Crea un botón por cada farol. Solo hace falta al cambiar de tamaño.
function construirTablero() {
  tablero.innerHTML = "";
  tablero.style.setProperty("--columnas", tamano);

  for (let fila = 0; fila < tamano; fila++) {
    for (let columna = 0; columna < tamano; columna++) {
      const farol = document.createElement("button");
      farol.className = "farol";
      farol.dataset.fila = fila;
      farol.dataset.columna = columna;
      farol.addEventListener("click", alPulsarFarol);
      tablero.appendChild(farol);
    }
  }
}

// Busca el botón de un farol concreto.
function botonDelFarol(fila, columna) {
  return tablero.querySelector(
    '[data-fila="' + fila + '"][data-columna="' + columna + '"]'
  );
}

// Pone cada farol encendido o apagado según el estado,
// y actualiza el marcador.
function dibujar() {
  for (let fila = 0; fila < tamano; fila++) {
    for (let columna = 0; columna < tamano; columna++) {
      const farol = botonDelFarol(fila, columna);
      const estaEncendido = encendido[fila][columna];

      farol.classList.toggle("encendido", estaEncendido);
      farol.setAttribute(
        "aria-label",
        "Fila " + (fila + 1) + ", columna " + (columna + 1) + ": " +
        (estaEncendido ? "encendido" : "apagado")
      );
    }
  }

  textoMovimientos.textContent = jugadas.length;
  textoObjetivo.textContent = objetivo;
  textoEncendidos.textContent = contarVerdaderos(encendido);

  botonDeshacer.disabled = jugadas.length === 0 || terminado;
  botonPista.disabled = terminado;
}

function quitarPista() {
  const conPista = tablero.querySelector(".pista");
  if (conPista) {
    conPista.classList.remove("pista");
  }
}

function mostrarMensaje(texto, esVictoria) {
  mensaje.textContent = texto;
  mensaje.classList.toggle("victoria", esVictoria === true);
}


// =====================================================================
//  ACCIONES DEL JUGADOR
// =====================================================================

function alPulsarFarol(evento) {
  if (terminado) {
    return;
  }

  const fila = Number(evento.currentTarget.dataset.fila);
  const columna = Number(evento.currentTarget.dataset.columna);

  quitarPista();
  pulsar(fila, columna);
  jugadas.push({ fila: fila, columna: columna });

  if (todoApagado()) {
    terminado = true;
    mostrarMensaje("¡Muelle a oscuras en " + jugadas.length + " movimientos!", true);
  } else {
    mostrarMensaje("");
  }

  dibujar();
}

function deshacer() {
  if (jugadas.length === 0) {
    return;
  }

  // Pulsar otra vez el mismo farol deshace la jugada.
  const ultima = jugadas.pop();
  pulsar(ultima.fila, ultima.columna);

  quitarPista();
  mostrarMensaje("Jugada deshecha.");
  dibujar();
}

function reiniciar() {
  encendido = copiarCuadricula(encendidoInicial);
  solucion = copiarCuadricula(solucionInicial);
  jugadas = [];
  terminado = false;

  quitarPista();
  mostrarMensaje("Puerto reiniciado.");
  dibujar();
}

// La pista es cualquier farol que siga marcado en la solución.
function darPista() {
  quitarPista();

  for (let fila = 0; fila < tamano; fila++) {
    for (let columna = 0; columna < tamano; columna++) {
      if (solucion[fila][columna]) {
        botonDelFarol(fila, columna).classList.add("pista");
        const faltan = contarVerdaderos(solucion);
        mostrarMensaje("Pulsa el farol marcado. Te faltan " + faltan + " pulsaciones.");
        return;
      }
    }
  }
}

function nuevaPartida() {
  crearPuzle();

  encendidoInicial = copiarCuadricula(encendido);
  solucionInicial = copiarCuadricula(solucion);
  objetivo = contarVerdaderos(solucion);
  jugadas = [];
  terminado = false;

  quitarPista();
  mostrarMensaje("Nuevo puerto de " + tamano + " × " + tamano + ".");
  dibujar();
}

function cambiarTamano() {
  tamano = Number(selectorTamano.value);
  construirTablero();
  nuevaPartida();
}


// =====================================================================
//  CONECTAR BOTONES Y EMPEZAR
// =====================================================================

botonNuevo.addEventListener("click", nuevaPartida);
botonDeshacer.addEventListener("click", deshacer);
botonReiniciar.addEventListener("click", reiniciar);
botonPista.addEventListener("click", darPista);
selectorTamano.addEventListener("change", cambiarTamano);

construirTablero();
nuevaPartida();
