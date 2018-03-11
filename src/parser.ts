import { IHDR, readIHDR, ColorTypes } from "./format/chunks/IHDR";
import { Chunk } from "./format/chunks/chunk";
import { Palette } from "./models/palette";
import { Bitmap } from "./models/bitmap";
import { ChunkTypes } from "./format/chunks/constants";
import * as pako from "pako";

export function parseChunks(chunks: Chunk[]) {
  const IHDR = readIHDR(chunks[0].data);
  const palette = parsePalette(IHDR, chunks);
  const data = parseData(IHDR, chunks);
  const bitmap = new Bitmap(IHDR, data, palette);
  return {
    chunks,
    info: IHDR,
    palette,
    suggestedPalettes: parseSuggestedPalettes(IHDR, chunks),
    data,
    bitmap,
  };
}

function getFirstChunkByType(chunks: Chunk[], type: ChunkTypes) {
  const chunksByType = getChunksByType(chunks, type);
  return chunksByType.length > 0 ? chunksByType[0] : undefined;
}

function getChunksByType(chunks: Chunk[], type: ChunkTypes) {
  return chunks.filter(chunk => chunk.type === type);
}

// static areChunkNamesEqual(name1: string, name2: string) {
//   return name1.toUpperCase() === name2.toUpperCase();
// }

function parsePalette(IHDR: IHDR, chunks: Chunk[]) {
  if (IHDR.colorType !== ColorTypes.IndexedColor) return undefined;

  const PLTE = getFirstChunkByType(chunks, ChunkTypes.PLTE);
  if (!PLTE) return undefined;

  const tRNS = getFirstChunkByType(chunks, ChunkTypes.tRNS);
  return Palette.fromPLTE(IHDR.bitDepth, PLTE, tRNS);
}

function parseSuggestedPalettes(IHDR: IHDR, chunks: Chunk[]) {
  const palettes: Palette[] = [];
  if (IHDR.colorType !== ColorTypes.IndexedColor) {
    const PLTE = getFirstChunkByType(chunks, ChunkTypes.PLTE);
    if (PLTE) {
      const tRNS = getFirstChunkByType(chunks, ChunkTypes.tRNS);
      palettes.push(Palette.fromPLTE(IHDR.bitDepth, PLTE, tRNS));
    }
  }

  for (const sPLT of getChunksByType(chunks, ChunkTypes.sPLT)) {
    palettes.push(Palette.fromSPLT(sPLT));
  }

  return palettes.length > 0 ? palettes : undefined;
}

function parseData(IHDR: IHDR, chunks: Chunk[]) {
  var inflator = new pako.Inflate();
  const IDAT = getChunksByType(chunks, ChunkTypes.IDAT);
  IDAT.forEach((chunk, index, array) => {
    const data = chunk.data;
    inflator.push(
      new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
      index === array.length - 1,
    );
  });

  if (inflator.err) {
    throw new Error(inflator.msg);
  }

  return inflator.result as Uint8Array;
}