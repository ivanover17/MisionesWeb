// el ordenador piensa un número secreto entre 1 y 100
const secreto = Math.floor(Math.random() * 100) + 1;
console.log("el secreto es:", secreto); // para hacer trampa mientras pruebas

// cogemos los elementos del HTML
const input = document.querySelector('#input-numero');
const boton = document.querySelector('#boton');
const mensaje = document.querySelector('#mensaje');
const intentosSpan = document.querySelector('#intentos');

let intentos = 0;

// cuando se hace click en el botón
boton.addEventListener('click', function () {

  const numero = Number(input.value);

  // si el número no vale, avisamos y no seguimos
  if (input.value === '' || numero < 1 || numero > 100) {
    mensaje.textContent = 'Pon un número entre 1 y 100';
    return;
  }

  // si el número vale, sumamos un intento
  intentos = intentos + 1;
  intentosSpan.textContent = intentos;

  if (numero === secreto) {
    mensaje.textContent = 'CORRECTO! El número era ' + secreto;
    boton.disabled = true; // ya no se puede seguir jugando
  } else if (numero < secreto) {
    mensaje.textContent = 'Es más grande';
  } else {
    mensaje.textContent = 'Es más pequeño';
  }

});