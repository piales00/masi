/**
 * Validación del formulario de pago de la recarga.
 *
 * Nada de lo que se escribe aquí sale del navegador: la recarga solo envía la cuenta y
 * el monto. Las comprobaciones existen para que la pantalla se comporte como un cobro
 * de verdad —que rechace un número mal escrito en vez de aceptar cualquier cosa—, no
 * para verificar un pago que no ocurre.
 */

/** Celular peruano: nueve dígitos que empiezan por 9. */
export function celularValido(valor: string): boolean {
  return /^9\d{8}$/.test(valor.replace(/\s/g, ''));
}

/** El código de aprobación de Yape son seis dígitos. */
export function codigoValido(valor: string): boolean {
  return /^\d{6}$/.test(valor.trim());
}

export function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

/** Agrupa de cuatro en cuatro, como lo hace cualquier pasarela. */
export function formatearTarjeta(valor: string): string {
  return soloDigitos(valor).slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function formatearVencimiento(valor: string): string {
  const digitos = soloDigitos(valor).slice(0, 4);
  return digitos.length <= 2 ? digitos : `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
}

/** Luhn, el mismo dígito de control que usan las tarjetas reales. */
export function tarjetaValida(valor: string): boolean {
  const digitos = soloDigitos(valor);
  if (digitos.length !== 16) return false;
  let suma = 0;
  for (let i = 0; i < digitos.length; i += 1) {
    let cifra = Number(digitos[digitos.length - 1 - i]);
    if (i % 2 === 1) {
      cifra *= 2;
      if (cifra > 9) cifra -= 9;
    }
    suma += cifra;
  }
  return suma % 10 === 0;
}

/** MM/AA que exista y no esté vencida. `ahora` se inyecta para poder probarlo. */
export function vencimientoValido(valor: string, ahora: Date = new Date()): boolean {
  const encaje = /^(\d{2})\/(\d{2})$/.exec(valor.trim());
  if (!encaje) return false;
  const mes = Number(encaje[1]);
  const anio = 2000 + Number(encaje[2]);
  if (mes < 1 || mes > 12) return false;
  // Vale todo el mes indicado: caduca al empezar el siguiente.
  return new Date(anio, mes, 1) > ahora;
}

export function cvcValido(valor: string): boolean {
  return /^\d{3,4}$/.test(valor.trim());
}

/** Número de operación con la pinta de una constancia de Yape. */
export function numeroOperacion(azar: () => number = Math.random): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let cuerpo = '';
  for (let i = 0; i < 8; i += 1) cuerpo += alfabeto[Math.floor(azar() * alfabeto.length)];
  return `MS-${cuerpo}`;
}

export function fechaDeConstancia(cuando: Date = new Date()): string {
  return new Intl.DateTimeFormat('es-PE', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(cuando);
}
