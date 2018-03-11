import { Chunk } from "./chunk";
import { assert } from "../../utils";

export type PLTE = DataView

// TODO: add validation of input
export function readPLTE(data: DataView): PLTE {
  return data;
  // const chunkUint8Array = new Uint8Array(data.buffer, offset, chunkSize);
  // const paletteUint8Array = new Uint8Array(chunkSize);
  // paletteUint8Array.set(chunkUint8Array)
  // return paletteUint8Array;
}

// TODO: add validation of input
// export function writePLTE(data: Uint8Array, offset: number, chunk: PLTE) {
//   memcpy(data.buffer, offset, chunk.buffer, chunk.byteOffset, chunk.byteLength);
// }

// function memcpy(dst: ArrayBuffer, dstOffset: number, src: ArrayBuffer, srcOffset: number, length: number) {
//   const dstU8 = new Uint8Array(dst, dstOffset, length);
//   const srcU8 = new Uint8Array(src, srcOffset, length);
//   dstU8.set(srcU8);
// };