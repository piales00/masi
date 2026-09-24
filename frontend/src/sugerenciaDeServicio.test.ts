import { describe, expect, it } from 'vitest';
import { sugerirServicio } from './sugerenciaDeServicio';

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
