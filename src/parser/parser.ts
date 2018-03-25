import { IHDR, readIHDR, ColorTypes } from '../format/chunks/IHDR';
import { Chunk } from '../format/chunks/chunk';
import { Color1D, Color3D } from '../models/color';
import { Palette } from '../models/palette';
import { decodeGreyscale, decodeTrueColor, decodeIndexed } from '../models/bitmap';
import { ChunkTypes } from '../format/constants';
import { ReverseFilter } from '../utils/decodeFilter';
import * as pako from 'pako';
import { assertT } from '../utils';
import { getFirstChunkByType, getChunksByType } from './utils';
import { ImageProps } from '../image/imageProps';

export interface ParsedChunksData {
  chunks: Chunk[];
  info: IHDR;
  palette?: Palette;
  gamma?: number;
  suggestedPalettes?: Palette[];
  backgroundColor?: ImageProps['backgroundColor'];
  singleTransparentColor?: Color1D | Color3D;
  bitmap: ReturnType<typeof decodeGreyscale | typeof decodeTrueColor | typeof decodeIndexed>;
}

export function parseChunks(chunks: Chunk[]): ParsedChunksData {
  assertT(getChunksByType(chunks, ChunkTypes.IDAT).length > 0, '(spec) IDAT chunk is missing');

  const IHDR = readIHDR(chunks[0].data);
  const palette = parsePalette(IHDR, chunks);
  const suggestedPalettes = parseSuggestedPalettes(IHDR, chunks);
  const singleTransparentColor = parseSingleTransparentColor(IHDR, chunks);

  const data = parseData(IHDR, chunks, palette);
  const gAMA = getFirstChunkByType(chunks, ChunkTypes.gAMA);
  const gamma = gAMA ? gAMA.data.getUint32(0) / 100000 : undefined;
  const bKGD = getFirstChunkByType(chunks, ChunkTypes.bKGD);
  const backgroundColor = parseBackgroundColor(IHDR, palette, bKGD);

  // console.log('gamma', gamma);
  // const bitmap = decodeBitmap(IHDR, data, palette);
  // return {
  //   chunks,
  //   info: IHDR,
  //   palette,
  //   suggestedPalettes: parseSuggestedPalettes(IHDR, chunks),
  //   singleTransparentColor: parseSingleTransparentColor(IHDR, chunks),
  //   data,
  //   bitmap,
  // };

  const base = {
    chunks,
    info: IHDR,
    gamma,
    suggestedPalettes,
    backgroundColor,
  };

  switch (IHDR.colorType) {
    case ColorTypes.GreyScale:
      assertT(getChunksByType(chunks, ChunkTypes.PLTE).length === 0, `(spec) PLTE chunk should not appear for colorType=${IHDR.colorType}`);
      return {
        ...base,
        singleTransparentColor,
        bitmap: decodeGreyscale(IHDR, data, false),
      };

    case ColorTypes.TrueColor:
      return {
        ...base,
        palette,
        singleTransparentColor,
        bitmap: decodeTrueColor(IHDR, data, false),
      };

    case ColorTypes.IndexedColor:
      assertT(palette, `(spec) PLTE chunk should appear for colorType=${IHDR.colorType}`);
      return {
        ...base,
        palette,
        singleTransparentColor,
        bitmap: decodeIndexed(IHDR, data, palette!),
      };

    case ColorTypes.GreyScaleWithAlpha:
      assertT(getChunksByType(chunks, ChunkTypes.PLTE).length === 0, `(spec) PLTE chunk should not appear for colorType=${IHDR.colorType}`);
      assertT(getChunksByType(chunks, ChunkTypes.tRNS).length === 0, `(spec) tRNS chunk should not appear for colorType=${IHDR.colorType}`);
      return {
        ...base,
        bitmap: decodeGreyscale(IHDR, data, true),
      };

    case ColorTypes.TrueColorWithAlpha:
      assertT(getChunksByType(chunks, ChunkTypes.tRNS).length === 0, `(spec) tRNS chunk should not appear for colorType=${IHDR.colorType}`);
      return {
        ...base,
        palette,
        bitmap: decodeTrueColor(IHDR, data, true),
      };
  }

  throw new Error('impossible error. colorTypes are already validated in IHDR');
}

function parsePalette(IHDR: IHDR, chunks: Chunk[]) {
  if (IHDR.colorType !== ColorTypes.IndexedColor) return;

  const PLTE = getFirstChunkByType(chunks, ChunkTypes.PLTE);
  if (!PLTE) return;

  const tRNS = getFirstChunkByType(chunks, ChunkTypes.tRNS);
  return Palette.fromPLTE(IHDR.bitDepth, PLTE, tRNS);
}

/**
 * Only for Non-Indexed ColorTypes
 */
function parseSingleTransparentColor(IHDR: IHDR, chunks: Chunk[]): ParsedChunksData['singleTransparentColor'] {
  if (IHDR.colorType === ColorTypes.IndexedColor) return;

  const tRNS = getFirstChunkByType(chunks, ChunkTypes.tRNS);
  if (!tRNS) return;

  switch (IHDR.colorType) {
    case ColorTypes.GreyScale:
      return [tRNS.data.getUint16(0)];

    case ColorTypes.TrueColor:
      return [
        tRNS.data.getUint16(0),
        tRNS.data.getUint16(2),
        tRNS.data.getUint16(4),
      ];
  }
}

function parseSuggestedPalettes(IHDR: IHDR, chunks: Chunk[]) {
  const palettes: Palette[] = [];
  if (IHDR.colorType !== ColorTypes.IndexedColor) {
    const PLTE = getFirstChunkByType(chunks, ChunkTypes.PLTE);
    if (PLTE) {
      palettes.push(Palette.fromPLTE(IHDR.bitDepth, PLTE));
    }
  }

  for (const sPLT of getChunksByType(chunks, ChunkTypes.sPLT)) {
    palettes.push(Palette.fromSPLT(sPLT));
  }

  return palettes.length > 0 ? palettes : undefined;
}

function parseData(IHDR: IHDR, chunks: Chunk[], palette?: Palette) {
  const inflator = new pako.Inflate();
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

  let result = inflator.result as Uint8Array;
  result = new ReverseFilter(result, IHDR).dst;
  return result;
}

function parseBackgroundColor(IHDR: IHDR, palette?: Palette, bKGD?: Chunk): ParsedChunksData['backgroundColor'] {
  if (!bKGD) return;

  switch (IHDR.colorType) {
    case ColorTypes.GreyScale:
    case ColorTypes.GreyScaleWithAlpha:
      return [bKGD.data.getUint16(0)];

    case ColorTypes.IndexedColor:
      if (!palette) return;
      return palette.getColor(bKGD.data.getUint8(0));

    case ColorTypes.TrueColor:
    case ColorTypes.TrueColorWithAlpha:
      return [
        bKGD.data.getUint16(0),
        bKGD.data.getUint16(2),
        bKGD.data.getUint16(4),
      ];
  }
}
