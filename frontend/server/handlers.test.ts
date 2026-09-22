import { describe, expect, it } from 'vitest';
import { GET } from '../api/[...ruta].js';
import { POST } from '../api/relayer.js';

describe('entradas de Vercel', () => {
  it('responde salud sin credenciales de Redis', async () => {
    const result = await GET(new Request('https://masiapp.vercel.app/api/salud'));
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ ok: true });
  });

  it('el relayer devuelve un error JSON para una petición inválida', async () => {
    const result = await POST(new Request('https://masiapp.vercel.app/api/relayer', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
    }));
    expect(result.status).toBe(400);
    expect((await result.json()).error.code).toBe('INVALID');
  });
});
