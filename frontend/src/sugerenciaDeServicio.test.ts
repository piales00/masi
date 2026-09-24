import { describe, expect, it } from 'vitest';
import { sugerirServicio } from './sugerenciaDeServicio';

/** Las frases tal cual se escribieron en las pruebas con el teléfono en la mano. */
const REALES: readonly [string, string | null][] = [
  ['Me compré una tele y necesito que alguien la instale', 'Instalaciones'],
  ['Se malogró mi PC y necesito una reparación', 'Reparaciones'],
  ['Quisiera pintar la fachada de mi casa', 'Pintura'],
  ['Se quemo mi foco', 'Electricidad'],
  ['Se quemó mi foco', 'Electricidad'],
  ['MI FOCO SE QUEMÓ', 'Electricidad'],
  ['La puerta se traba', 'Cerrajería'],
  ['Se rompió la cañería', 'Gasfitería'],
  ['Hay un cortocircuito', 'Electricidad'],
];

/** Lo que NO debe pasar: cada frase con el oficio que tendría que quedar descartado. */
const FALSOS: readonly [string, string][] = [
  ['Necesito un trabajo de pintura', 'Cerrajería'],
  ['Necesito trabajar la madera', 'Cerrajería'],
  ['Es en el parque cercano', 'Gasfitería'],
  ['El mueble quedó corto', 'Electricidad'],
];

describe('frases reales de la prueba en el celular', () => {
  it.each(REALES)('«%s» → %s', (frase, esperado) => {
    expect(sugerirServicio(frase)).toBe(esperado);
  });

  it.each(FALSOS)('«%s» no es %s', (frase, descartado) => {
    expect(sugerirServicio(frase)).not.toBe(descartado);
  });
});

describe('una raíz no se cuela dentro de otra palabra', () => {
  it('preparar la pared no es una reparación', () => {
    // «repara» vive dentro de «preparar», pero no empieza esa palabra.
    expect(sugerirServicio('Necesito preparar la pared antes de pintar')).toBe('Pintura');
    expect(sugerirServicio('Necesito preparación antes de pintar la pared')).toBe('Pintura');
    expect(sugerirServicio('Hay que preparar la superficie')).toBeNull();
  });

  it('pero reparar y reparación sí lo son', () => {
    expect(sugerirServicio('Necesito reparar la puerta')).toBe('Reparaciones');
    expect(sugerirServicio('Necesito una reparación')).toBe('Reparaciones');
    expect(sugerirServicio('Ya está reparado, pero quedó mal')).toBe('Reparaciones');
  });

  it('las demás raíces tampoco se cuelan a mitad de palabra', () => {
    expect(sugerirServicio('Quiero desinstalar la idea')).toBeNull();
    expect(sugerirServicio('El precio es desproporcionado')).toBeNull();
    expect(sugerirServicio('Me cobraron un recargo')).toBeNull();
  });

  it('límite conocido: una palabra que sí empieza por la raíz sigue contando', () => {
    // «pintoresco» empieza por `pint`, así que la regla de inicio de palabra no lo filtra.
    // Se deja documentado: en una descripción de avería no aparece, y la alternativa
    // sería enumerar seis formas de «pintar» para cubrir lo mismo.
    expect(sugerirServicio('Es un sitio muy pintoresco')).toBe('Pintura');
  });
});

describe('sugerencia de servicio', () => {
  it('un foco quemado es electricidad, se escriba como se escriba', () => {
    // El caso real de la prueba en el celular: sin tilde, con tilde y en mayúsculas.
    expect(sugerirServicio('Se quemo mi foco')).toBe('Electricidad');
    expect(sugerirServicio('Se quemó mi foco')).toBe('Electricidad');
    expect(sugerirServicio('MI FOCO SE QUEMÓ')).toBe('Electricidad');
    expect(sugerirServicio('¡Se quemó el foco, otra vez!')).toBe('Electricidad');
  });

  it('reconoce el resto de oficios por sus palabras', () => {
    expect(sugerirServicio('La chapa de la puerta no gira')).toBe('Cerrajería');
    expect(sugerirServicio('Hay una fuga en la tubería')).toBe('Gasfitería');
    expect(sugerirServicio('Quiero pintar la sala')).toBe('Pintura');
    expect(sugerirServicio('Se rompió la puerta del closet')).toBe('Carpintería');
    expect(sugerirServicio('Necesito colgar una repisa')).toBe('Instalaciones');
    expect(sugerirServicio('Limpieza profunda de la cocina')).toBe('Limpieza');
  });

  it('las palabras ambiguas no arrastran a Electricidad', () => {
    // Cortar no es un cortocircuito, y quedar corto tampoco.
    expect(sugerirServicio('Necesito cortar una madera')).toBe('Carpintería');
    expect(sugerirServicio('El mueble quedó corto')).toBe('Carpintería');
    expect(sugerirServicio('Tengo un cortocircuito en la cocina')).toBe('Electricidad');
    expect(sugerirServicio('Hay un corto circuito en el pasillo')).toBe('Electricidad');
    // «corto eléctrico» entra por «electric», sin necesidad de otra entrada en la tabla.
    expect(sugerirServicio('Hubo un corto eléctrico')).toBe('Electricidad');
  });

  it('un trabajo cualquiera no es cerrajería', () => {
    // «traba» vivía dentro de «trabajo» y se llevaba casi cualquier frase.
    expect(sugerirServicio('Necesito un trabajo de pintura')).toBe('Pintura');
    expect(sugerirServicio('Busco a alguien que trabaje la madera')).toBe('Carpintería');
    expect(sugerirServicio('La puerta se traba y no cierra')).toBe('Cerrajería');
  });

  it('una referencia cercana no es gasfitería', () => {
    // «cano» vivía dentro de «cercano».
    expect(sugerirServicio('Es en el parque cercano al mercado')).toBeNull();
    expect(sugerirServicio('Se rompió la cañería del baño')).toBe('Gasfitería');
  });

  it('sin pistas no inventa un oficio', () => {
    expect(sugerirServicio('Hola, buenas tardes')).toBeNull();
    expect(sugerirServicio('')).toBeNull();
    expect(sugerirServicio('ab')).toBeNull();
  });

  it('gana el oficio con más coincidencias, no el primero de la tabla', () => {
    // «pintar» es una pista de Pintura; «foco» y «enchufe», dos de Electricidad.
    expect(sugerirServicio('Quiero pintar, y además el foco y el enchufe fallan')).toBe('Electricidad');
  });

  it('el mismo texto siempre da la misma respuesta', () => {
    const texto = 'Se quemo mi foco';
    expect(sugerirServicio(texto)).toBe(sugerirServicio(texto));
  });
});
