import { Palette } from '../models/palette';
import { BitDepth } from '../format/chunks/IHDR';

export const ChannelsY = 'Y';
export const ChannelsYA = 'YA';
export const ChannelsRGB = 'RGB';
export const ChannelsRGBA = 'RGBA';

export type ChannelsMap =
  | typeof ChannelsY
  | typeof ChannelsYA
  | typeof ChannelsRGB
  | typeof ChannelsRGBA;

export interface ImageProps {
  /** non-negative non-zero width in px */
  width: number;
  /** non-negative non-zero height in px */
  height: number;

  /** for indexed-colour images, the number of bits per palette index (so, 2^bitDepth colors in palette). For other images, the number of bits per sample in the image */
  bitDepth: BitDepth;

  /** number of bits used to represent a sample value. In an indexed-colour PNG image, samples are stored in the palette and thus the sample depth is always 8 by definition of the palette. In other types of PNG image it is the same as the bit depth. */
  sampleDepth: BitDepth;

  palette?: Palette;
  channelsMap: ChannelsMap;
  channelsData: Uint8Array | Uint16Array;
}
