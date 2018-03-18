import { Chunk } from './chunk';
import { assert, assertT } from '../../utils';

export const enum ColorTypeMasks {
  NoneMask = 0,
  PaletteMask = 1,
  TrueColorMask = 2,
  AlphaMask = 4,
}

export const enum ColorTypes {
  /** ColorTypeMasks.NoneMask */
  GreyScale = 0,
  /** ColorTypeMasks.TrueColorMask */
  TrueColor = 2,
  /** ColorTypeMasks.PaletteMask | ColorTypeMasks.TrueColorMask */
  IndexedColor = 3,
  /** ColorTypeMasks.AlphaMask */
  GreyScaleWithAlpha = 4,
  /** ColorTypeMasks.TrueColorMask | ColorTypeMasks.AlphaMask */
  TrueColorWithAlpha = 6,
}

export const enum InterlaceMethods {
  None = 0,
  Adam7 = 1,
}

export interface ColorTypeMap<T> extends Object {
  0: T;
  2: T;
  3: T;
  4: T;
  6: T;
}

export type BitDepth = 1 | 2 | 4 | 8 | 16;

export interface IHDR {
  /** non-negative non-zero width in px */
  width: number;

  /** non-negative non-zero height in px */
  height: number;

  /** for indexed-colour images, the number of bits per palette index (so, 2^bitDepth colors in palette). For other images, the number of bits per sample in the image */
  bitDepth: BitDepth;

  /** value denoting how colour and alpha are specified in the PNG image. Colour types are sums of the following values: 1 (palette used), 2 (truecolour used), 4 (alpha used). The permitted values of colour type are 0, 2, 3, 4, and 6. */
  colorType: ColorTypes;

  /** Only compression method 0 (deflate/inflate compression with a sliding window of at most 32768 bytes) is defined in International Standard */
  compression: 0;

  /** Only filter method 0 (adaptive filtering with five basic filter types) is defined in International Standard */
  filter: 0;

  /** Two values are defined in this International Standard: 0 (no interlace) or 1 (Adam7 interlace) */
  interlace: InterlaceMethods;

  /** number of bits used to represent a sample value. In an indexed-colour PNG image, samples are stored in the palette and thus the sample depth is always 8 by definition of the palette. In other types of PNG image it is the same as the bit depth. */
  readonly sampleDepth: IHDR['bitDepth'];
}

// TODO: add validation of input
export function readIHDR(dataView: DataView) {
  const chunk = {
    width: dataView.getUint32(0),
    height: dataView.getUint32(4),
    bitDepth: dataView.getUint8(8),
    colorType: dataView.getUint8(9),
    compression: dataView.getUint8(10),
    filter: dataView.getUint8(11),
    interlace: dataView.getUint8(12),
    get sampleDepth() {
      return this.colorType & ColorTypeMasks.PaletteMask ? 8 : this.bitDepth;
    },
  };
  validateIHDR(chunk);
  return chunk as IHDR;
}

// TODO: add validation of input
export function writeIHDR(data: Uint8Array, offset: number, chunk: IHDR) {
  validateIHDR(chunk);
  const dataView = new DataView(data.buffer, offset, 13);
  dataView.setUint32(0, chunk.width);
  dataView.setUint32(4, chunk.height);
  dataView.setUint8(8, chunk.bitDepth);
  dataView.setUint8(9, chunk.colorType);
  dataView.setUint8(10, chunk.compression);
  dataView.setUint8(11, chunk.filter);
  dataView.setUint8(12, chunk.interlace);
  return 13;
}

export function validateIHDR(chunkToValidate: any) {
  const chunk = chunkToValidate as IHDR;
  assertT(chunk.width > 0, msg`Width should be greater than 0`);
  assertT(chunk.height > 0, msg`Width should be greater than 0`);
  validateBitDepth(chunk.bitDepth, chunk.colorType);
  assertT(
    chunk.compression === 0,
    msg`Compression method ${chunk.compression} is spotted. Only compression method 0 is supported`,
  );
  assertT(
    chunk.filter === 0,
    msg`Filter method ${chunk.filter} is spotted. Only filter method 0 is supported`,
  );
  assertT(
    [InterlaceMethods.None, InterlaceMethods.Adam7].includes(chunk.interlace),
    msg`Interlace method ${chunk.interlace} is spotted. Supported interlace methods are ${InterlaceMethods.None}=None, ${InterlaceMethods.Adam7}=Adam7`,
  );
  return true;
}

function validateBitDepth(bitDepth: number, colorType: ColorTypes) {
  const allowedBitDepths: ColorTypeMap<number[]> = {
    [ColorTypes.GreyScale]: [1,2,4,8,16],
    [ColorTypes.TrueColor]: [8,16],
    [ColorTypes.IndexedColor]: [1,2,4,8],
    [ColorTypes.GreyScaleWithAlpha]: [8,16],
    [ColorTypes.TrueColorWithAlpha]: [8,16],
  };

  const allowedByColorType = allowedBitDepths[colorType];
  assertT(Array.isArray(allowedByColorType), msg`colorType=${colorType} is found, allowed values for colorType are ${Object.keys(allowedBitDepths).map(Number)}`);
  assertT(allowedByColorType.includes(bitDepth), msg`colorType=${colorType} allows bitDepth to be one of 1,2,4,8,16, but bitDepth ${bitDepth} is found`);
}

function msg(literals: TemplateStringsArray, ...placeholders: any[]) {
  const result = [];

  // interleave the literals with the placeholders
  for (let i = 0; i < placeholders.length; i++) {
    result.push(literals[i]);
    result.push(placeholders[i]);
  }

  result.push(literals[literals.length - 1]);
  return '(spec) IHDR error: ' + result.join('');
}
