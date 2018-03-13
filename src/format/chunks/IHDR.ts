import { Chunk } from "./chunk";
import { assert } from "../../utils";

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
  
  /** for indexed-colour images, the number of bits per palette index (so, 2^bitDepth colors in palette). For other images, the number of bits per sample in the image */
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
export function readIHDR(dataView: DataView): IHDR {
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
    }
  };
  if (validateIHDR(chunk)) {
    return chunk;
  }
  throw new Error(`Chunk IHDR is not valid`);
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

export function validateIHDR(chunkToValidate: any): chunkToValidate is IHDR {
  const chunk = chunkToValidate as IHDR;
  assert(chunk.width > 0);
  assert(chunk.height > 0);
  switch (chunk.colorType) {
    case ColorTypes.GreyScale: assert([1,2,4,8,16].includes(chunk.bitDepth)); break;
    case ColorTypes.TrueColor: assert([8,16].includes(chunk.bitDepth)); break;
    case ColorTypes.IndexedColor: assert([1,2,4,8].includes(chunk.bitDepth)); break;
    case ColorTypes.GreyScaleWithAlpha: assert([8,16].includes(chunk.bitDepth)); break;
    case ColorTypes.TrueColorWithAlpha: assert([8,16].includes(chunk.bitDepth)); break;
    default: assert();
  }
  assert(chunk.compression, 0);
  assert(chunk.filter, 0);
  assert([InterlaceMethods.None, InterlaceMethods.Adam7].includes(chunk.interlace));
  return true;
}