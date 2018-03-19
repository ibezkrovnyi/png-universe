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
    return { r: y, g: y, b: y };
  },
};

export interface ToTypedArrayOptions {
  channelsMap?: ChannelsMap;
  sampleDepth?: BitDepth;
  applyGamma?: boolean;
  smartColorsReducer?: {
    colorDistanceFormula?: ColorDistanceFormula;
    paletteQuantization?: PaletteQuantization;
    colors?: number;
  };
}

function generateGammaLookup(gamma: number, sourceSampleDepth: number) {
  const sourceMaxChannelValue = 2 ** sourceSampleDepth - 1;
  const gammaLookupTable = sourceSampleDepth === 16 ? new Uint16Array(sourceMaxChannelValue + 1) : new Uint8Array(sourceMaxChannelValue + 1);
  for (let i = 0; i <= sourceMaxChannelValue; i++) {
    gammaLookupTable[i] = sourceMaxChannelValue * Math.pow(i / sourceMaxChannelValue, gamma);
  }
  return gammaLookupTable;
}

function getScaler(sourceSampleDepth: number, targetSampleDepth: number, gamma: number) {
  const sourceMaxChannelValue = 2 ** sourceSampleDepth - 1;
  const targetMaxChannelValue = 2 ** targetSampleDepth - 1;
  const scaleMultiplier = targetMaxChannelValue / sourceMaxChannelValue;
  // const clamp = (num: number) => Math.min(targetMaxChannelValue, Math.max(0, num));
  const clamp = (num: number) => num < 0 ? 0 : num > targetMaxChannelValue ? targetMaxChannelValue : num;
  // const correctGamma = (C: number) => sourceMaxChannelValue * Math.pow(C / sourceMaxChannelValue, gamma);
  const gammaLookupTable = generateGammaLookup(gamma, sourceSampleDepth);
  const scaler = gamma !== 1 ?
    (C: number) => clamp(Math.round(gammaLookupTable[C] * scaleMultiplier)) :
    (C: number) => clamp(Math.round(C * scaleMultiplier));

  return scaler;
}

function getPixelMappers(src: TypedArrayStream, dst: TypedArrayStream, sourceSampleDepth: number, targetSampleDepth: number, sourceChannelsMap: ChannelsMap, targetChannelsMap: ChannelsMap, gamma: number) {
  const targetOpaque = Colors.getOpaque(targetSampleDepth);
  const scale = getScaler(sourceSampleDepth, targetSampleDepth, gamma);

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

export function toCustomImageData(sourceImage: ImageProps, { channelsMap = ChannelsRGBA, sampleDepth = 8, applyGamma = true }: ToTypedArrayOptions = {}) {
  const pixels = sourceImage.width * sourceImage.height;
  const targetData = sampleDepth === 16 ? new Uint16Array(pixels * channelsMap.length) : new Uint8Array(pixels * channelsMap.length);
  const gamma = applyGamma && typeof sourceImage.gamma === 'number' ? 1 / 2.2 / sourceImage.gamma : 1;
  const mapper = getPixelMappers(
    new TypedArrayStream(sourceImage.channelsData),
    new TypedArrayStream(targetData),
    sourceImage.sampleDepth,
    sampleDepth,
    sourceImage.channelsMap,
    channelsMap,
    gamma,
  );

  for (let index = 0; index < pixels; index++) {
    mapper();
  }

  return targetData;
}
