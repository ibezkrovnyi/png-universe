import { IHDR, readIHDR, ColorTypes } from "./format/chunks/IHDR";
import { Chunk } from "./format/chunks/chunk";
import { Palette } from "./models/palette";
import { Bitmap } from "./models/bitmap";
import { ChunkTypes } from "./format/chunks/constants";
import { ReverseFilter } from './utils/decodeFilter';
import * as pako from "pako";

export function parseChunks(chunks: Chunk[]) {
  const IHDR = readIHDR(chunks[0].data);
  const palette = parsePalette(IHDR, chunks);
  const data = parseData(IHDR, chunks, palette);
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

function parseData(IHDR: IHDR, chunks: Chunk[], palette?: Palette) {
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

  // let result = require('browserify-zlib').inflateSync(Buffer.concat(IDAT.map(chunk => new Buffer(chunk.data.buffer))));

  let result = inflator.result as Uint8Array;
  result = new ReverseFilter(result, IHDR).outData;
  //result = IHDR.colorType === ColorTypes.IndexedColor ? indexedToTrueColorWithAlpha(IHDR, result, palette) : result;
  // const filterReversed = IHDR.colorType === ColorTypes.IndexedColor ? uncompressed : new ReverseFilter(uncompressed, IHDR).outData;

  // const uncompressed = inflator.result as Uint8Array;
  // return indexedToTrueColorWithAlpha(IHDR, uncompressed, palette);
  

  // let trueColor = IHDR.colorType === ColorTypes.IndexedColor ? indexedToTrueColorWithAlpha(IHDR, filterReversed, palette) : inflator.result as Uint8Array

  return result;
}

function indexedToTrueColorWithAlpha(IHDR: IHDR, indexedData: Uint8Array, palette?: Palette) {
  if (!palette) throw new Error('palette not found');
  const pixels = IHDR.width * IHDR.height;
  const data = new Uint8Array(pixels * 4);
  switch (IHDR.bitDepth) {
    case 1:
      // TODO: other bit/sample depth?
      throw new Error('not implemented yet');
    case 2:
      const lineByteLength = Math.ceil(IHDR.width / 4);
      for (let y = 0; y < IHDR.height; y++) {
        for (let x = 0; x < IHDR.width; x+=4) {
          let srcByteOffset = lineByteLength * y + x/4;
          const uint8 = indexedData[srcByteOffset];

          for (let pixelInGroup = 0; pixelInGroup < 4; pixelInGroup++) {
            const dstBase = (y * IHDR.width + x + (3-pixelInGroup)) * 4;
            const colorIndex = (uint8 >> (pixelInGroup*2)) & 3;
            const color = palette.getColor(colorIndex);
            data[dstBase + 0] = color.r;
            data[dstBase + 1] = color.g;
            data[dstBase + 2] = color.b;
            data[dstBase + 3] = color.a;
          }
        }
      }
      break;
    case 4:
      // TODO: other bit/sample depth?
      throw new Error('not implemented yet');

    case 8:
      for (let index = 0; index < pixels; index++) {
        const color = palette.getColor(indexedData[index]);
        data[index * 4 + 0] = color.r;
        data[index * 4 + 1] = color.g;
        data[index * 4 + 2] = color.b;
        data[index * 4 + 3] = color.a;
      }
      break;
  }
  return data;
}
