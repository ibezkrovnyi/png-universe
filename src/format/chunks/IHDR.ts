const readUInt32BE = (data: Uint8Array, offset: number) =>
  data[offset] * 2 ** 24 +
  data[offset+1] * 2 ** 16 +
  data[offset+2] * 2 ** 8 +
  data[offset+3];

const readUInt8 = (data: Uint8Array, offset: number) =>
  data[offset];

const writeUInt32BE = (data: Uint8Array, offset: number, value: number) => {
  data[offset] = (value >>> 24);
  data[offset+1] = (value >>> 16);
  data[offset+2] = (value >>> 8);
  data[offset+3] = value;
}

const writeUInt8 = (data: Uint8Array, offset: number, value: number) => {
  data[offset] = value;
}

export const enum ColorTypeMasks {
  NoneMask = 0,
  PaletteMask = 1,
  TrueColorMask = 2,
  AlphaMask = 4,
}

export const enum ColorTypes {
  GreyScale = ColorTypeMasks.NoneMask,
  TrueColor = ColorTypeMasks.TrueColorMask,
  IndexedColor = ColorTypeMasks.PaletteMask | ColorTypeMasks.TrueColorMask,
  GreyScaleWithAlpha = ColorTypeMasks.AlphaMask,
  TrueColorWithAlpha = ColorTypeMasks.TrueColorMask | ColorTypeMasks.AlphaMask,
}

export const enum InterlaceMethods {
  None = 0,
  Adam7 = 1,
}

export interface IHDR {
  /** non-negative non-zero width in px */
  width: number
  
  /** non-negative non-zero height in px */
  height: number
  
  /** for indexed-colour images, the number of bits per palette index. For other images, the number of bits per sample in the image */
  bitDepth: 1 | 2 | 4 | 8 | 16
  
  /** value denoting how colour and alpha are specified in the PNG image. Colour types are sums of the following values: 1 (palette used), 2 (truecolour used), 4 (alpha used). The permitted values of colour type are 0, 2, 3, 4, and 6. */
  colorType: ColorTypes
  
  /** Only compression method 0 (deflate/inflate compression with a sliding window of at most 32768 bytes) is defined in International Standard */
  compression: 0
  
  /** Only filter method 0 (adaptive filtering with five basic filter types) is defined in International Standard */
  filter: 0

  /** Two values are defined in this International Standard: 0 (no interlace) or 1 (Adam7 interlace) */
  interlace: InterlaceMethods
  
  /** number of bits used to represent a sample value. In an indexed-colour PNG image, samples are stored in the palette and thus the sample depth is always 8 by definition of the palette. In other types of PNG image it is the same as the bit depth. */
  readonly sampleDepth: IHDR['bitDepth']
}

// TODO: add validation of input
export function readIHDR(data: Uint8Array) {
  return {
    width: readUInt32BE(data, 0),
    height: readUInt32BE(data, 4),
    depth: readUInt8(data, 8),
    colorType: readUInt8(data, 9),
    compression: readUInt8(data, 10),
    filter: readUInt8(data, 11),
    interlace: readUInt8(data, 12),
    get sampleDepth() {
      return this.colorType & ColorTypeMasks.PaletteMask ? 8 : this.bitDepth;
    }
  };
}

export function writeIHDR(data: Uint8Array, chunk: IHDR) {
  writeUInt32BE(data, 0, chunk.width);
  writeUInt32BE(data, 4, chunk.height);
  writeUInt8(data, 8, chunk.bitDepth);
  writeUInt8(data, 9, chunk.colorType);
  writeUInt8(data, 10, chunk.compression);
  writeUInt8(data, 11, chunk.filter);
  writeUInt8(data, 12, chunk.interlace);
}