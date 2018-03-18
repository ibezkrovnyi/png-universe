import { ChannelsMap, ImageProps, ChannelsY, ChannelsRGBA, ChannelsRGB, ChannelsYA } from './imageProps';
import { Colors } from '../format/constants';
import { BitDepth } from '../format/chunks/IHDR';
import { TypedArrayStream } from '../utils/TypedArrayStream';
import { buildPalette, ColorDistanceFormula, PaletteQuantization } from 'image-q';

// TODO: BT.709
// TODO: BT.2100/BT.2020 https://en.wikipedia.org/wiki/Rec._2100

const BT709 = {
  rgb2luma(r: number, g: number, b: number) {
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  },
  luma2rgb(y: number) {
    const g = y * 0.7152;
    const r = y * 0.2126;
    const b = (y - 0.2126 * r + 0.7152 * g) / 0.0722;
    return { r, g, b };
  },
};

export interface ToTypedArrayOptions {
  channelsMap?: ChannelsMap;
  sampleDepth?: BitDepth;
  smartColorsReducer?: {
    colorDistanceFormula?: ColorDistanceFormula;
    paletteQuantization?: PaletteQuantization;
    colors?: number;
  };
}

function getPixelMappers(src: TypedArrayStream, dst: TypedArrayStream, sourceSampleDepth: number, targetSampleDepth: number, sourceChannelsMap: ChannelsMap, targetChannelsMap: ChannelsMap) {
  const targetOpaque = Colors.getOpaque(targetSampleDepth);
  const scaleMultiplier = (2 ** targetSampleDepth - 1) / (2 ** sourceSampleDepth - 1);
  const clamp = (value: number) => Math.min(2 ** targetSampleDepth - 1, Math.max(0, value));
  const scale = (C: number) => clamp(Math.round(C * scaleMultiplier));

  const mappers: Record<ChannelsMap, Record<ChannelsMap, () => void>> = {
    [ChannelsY]: {
      [ChannelsY]: () => {
        dst.write(scale(src.read()));
      },
      [ChannelsYA]: () => {
        dst.write(scale(src.read()));
        dst.write(targetOpaque);
      },
      [ChannelsRGB]: () => {
        const rgb = BT709.luma2rgb(src.read());
        dst.write(scale(rgb.r));
        dst.write(scale(rgb.g));
        dst.write(scale(rgb.b));
      },
      [ChannelsRGBA]: () => {
        const rgb = BT709.luma2rgb(src.read());
        dst.write(scale(rgb.r));
        dst.write(scale(rgb.g));
        dst.write(scale(rgb.b));
        dst.write(targetOpaque);
      },
    },
    [ChannelsYA]: {
      [ChannelsY]: () => {
        // TODO: source has alpha channel, Y should be blended onto reference background color using that alpha
        dst.write(scale(src.read()));
        src.skip(1);
      },
      [ChannelsYA]: () => {
        dst.write(scale(src.read()));
        dst.write(scale(src.read()));
      },
      [ChannelsRGB]: () => {
        // TODO: source has alpha channel, RGB should be blended onto reference background color using that alpha
        const rgb = BT709.luma2rgb(src.read());
        dst.write(scale(rgb.r));
        dst.write(scale(rgb.g));
        dst.write(scale(rgb.b));
        src.skip(1);
      },
      [ChannelsRGBA]: () => {
        const rgb = BT709.luma2rgb(src.read());
        dst.write(scale(rgb.r));
        dst.write(scale(rgb.g));
        dst.write(scale(rgb.b));
        dst.write(scale(src.read()));
      },
    },
    [ChannelsRGB]: {
      [ChannelsY]: () => {
        // TODO: allow custom RGB => Y converter function
        // TODO: use converter function from image-q
        const R = src.read();
        const G = src.read();
        const B = src.read();
        dst.write(scale(BT709.rgb2luma(R, G, B)));
      },
      [ChannelsYA]: () => {
        const R = src.read();
        const G = src.read();
        const B = src.read();
        dst.write(scale(BT709.rgb2luma(R, G, B)));
        dst.write(targetOpaque);
      },
      [ChannelsRGB]: () => {
        dst.write(scale(src.read()));
        dst.write(scale(src.read()));
        dst.write(scale(src.read()));
      },
      [ChannelsRGBA]: () => {
        dst.write(scale(src.read()));
        dst.write(scale(src.read()));
        dst.write(scale(src.read()));
        dst.write(targetOpaque);
      },
    },
    [ChannelsRGBA]: {
      [ChannelsY]: () => {
        // TODO: source has alpha channel, Y should be blended onto reference background color using that alpha
        // TODO: allow custom RGB => Y converter function
        // TODO: use converter function from image-q
        const R = src.read();
        const G = src.read();
        const B = src.read();
        dst.write(scale(BT709.rgb2luma(R, G, B)));
        src.skip(1);
      },
      [ChannelsYA]: () => {
        // TODO: allow custom RGB => Y converter function
        // TODO: use converter function from image-q
        const R = src.read();
        const G = src.read();
        const B = src.read();
        dst.write(scale(BT709.rgb2luma(R, G, B)));
        dst.write(scale(src.read()));
      },
      [ChannelsRGB]: () => {
        // TODO: source has alpha channel, RGB should be blended onto reference background color using that alpha
        dst.write(scale(src.read()));
        dst.write(scale(src.read()));
        dst.write(scale(src.read()));
        src.skip(1);
      },
      [ChannelsRGBA]: () => {
        dst.write(scale(src.read()));
        dst.write(scale(src.read()));
        dst.write(scale(src.read()));
        dst.write(scale(src.read()));
      },
    },
  };

  return mappers[sourceChannelsMap][targetChannelsMap];
}

export function toCustomImageData(sourceImage: ImageProps, { channelsMap = ChannelsRGBA, sampleDepth = 8 }: ToTypedArrayOptions = {}) {
  const pixels = sourceImage.width * sourceImage.height;
  const targetData = sampleDepth === 16 ? new Uint16Array(pixels * channelsMap.length) : new Uint8Array(pixels * channelsMap.length);
  const mapper = getPixelMappers(
    new TypedArrayStream(sourceImage.channelsData),
    new TypedArrayStream(targetData),
    sourceImage.sampleDepth,
    sampleDepth,
    sourceImage.channelsMap,
    channelsMap,
  );

  for (let index = 0; index < pixels; index++) {
    mapper();
  }

  return targetData;
}
