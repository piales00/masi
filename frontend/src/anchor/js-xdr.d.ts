/**
 * `@stellar/js-xdr` no publica tipos. Se declara solo lo que usa `entradas.ts`:
 * el descriptor de array variable y el escritor. Todo lo demás del paquete queda fuera
 * a propósito, para que una firma que cambie se note al compilar.
 */
declare module '@stellar/js-xdr' {
  export class XdrWriter {
    finalize(): Buffer;
  }

  export class VarArray {
    constructor(childType: unknown, maxLength: number);
    fromXDR(input: Buffer): unknown[];
    write(value: unknown[], writer: XdrWriter): void;
  }

  const XDR: {
    VarArray: typeof VarArray;
    XdrWriter: typeof XdrWriter;
  };
  export default XDR;
  export { XDR };
}
