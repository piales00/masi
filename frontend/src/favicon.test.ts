import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * El icono del sitio es lo que el gestor de llaves enseña junto a la credencial, así que
 * conviene que no se pierda en una limpieza: esto fija que el asset existe, que sale del
 * icono oficial y que `index.html` lo apunta.
 */
const ICONO = 'public/branding/masi-icon-192.png';
const OFICIAL = '../branding/masi-app-store-icon.png';

/** Ancho y alto de un PNG: van en el IHDR, justo detrás de la firma. */
function tamano(ruta: string): { ancho: number; alto: number } {
  const bytes = readFileSync(ruta);
  return { ancho: bytes.readUInt32BE(16), alto: bytes.readUInt32BE(20) };
}

describe('icono del sitio', () => {
  it('el asset existe dentro de frontend/public y es cuadrado', () => {
    const { ancho, alto } = tamano(ICONO);
    expect(ancho).toBe(192);
    expect(alto).toBe(192);
  });

  it('pesa mucho menos que el original sin dejar de ser nítido', () => {
    expect(statSync(ICONO).size).toBeLessThan(statSync(OFICIAL).size / 10);
  });

  it('sale del icono oficial, que sigue intacto', () => {
    // La fuente no se toca: solo se reescala hacia `public/`.
    const original = tamano(OFICIAL);
    expect(original).toEqual({ ancho: 1254, alto: 1254 });
  });

  it('index.html lo referencia y ya no apunta al icono antiguo', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('href="/branding/masi-icon-192.png"');
    expect(html).not.toContain('favicon.svg');
  });
});
