import { ChannelsMap, ImageProps, ChannelsY, ChannelsRGBA, ChannelsRGB, ChannelsYA } from './imageProps';
import { Colors } from '../format/constants';
import { BitDepth } from '../format/chunks/IHDR';
import { TypedArrayStream } from '../utils/TypedArrayStream';
import { buildPalette, ColorDistanceFormula, PaletteQuantization, image } from 'image-q';
import { getFirstChunkByType } from '../parser/utils';

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
  applyBackgroundColor?: boolean;
  smartColorsReducer?: {
    colorDistanceFormula?: ColorDistanceFormula;
    paletteQuantization?: PaletteQuantization;
    colors?: number;
  };
}

function generateGammaLookup(gamma: number, sourceSampleDepth: number) {
  const sourceMaxChannelValue = 2 ** sourceSampleDepth - 1;
  const gammaLookupTable = new Array(sourceMaxChannelValue + 1);
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
  // const scaler = gamma !== 1 ?
  //   (C: number) => clamp(Math.round(correctGamma(C) * scaleMultiplier)) :
  //   (C: number) => clamp(Math.round(C * scaleMultiplier));
  const gammaLookupTable = generateGammaLookup(gamma, sourceSampleDepth);
  const scaler = gamma !== 1 ?
    (C: number) => clamp(Math.round(gammaLookupTable[C] * scaleMultiplier)) :
    (C: number) => clamp(Math.round(C * scaleMultiplier));

  return scaler;
}

function getPixelMappers(src: TypedArrayStream, dst: TypedArrayStream, targetOpaque: number, scaler: (c: number) => number) {
  const mappers: Record<ChannelsMap, Record<ChannelsMap, () => void>> = {
    [ChannelsY]: {
      [ChannelsY]: () => {
        dst.write(scaler(src.read()));
      },
      [ChannelsYA]: () => {
        dst.write(scaler(src.read()));
        dst.write(targetOpaque);
      },
      [ChannelsRGB]: () => {
        const rgb = BT709.luma2rgb(src.read());
        dst.write(scaler(rgb.r));
        dst.write(scaler(rgb.g));
        dst.write(scaler(rgb.b));
      },
      [ChannelsRGBA]: () => {
        const rgb = BT709.luma2rgb(src.read());
        dst.write(scaler(rgb.r));
        dst.write(scaler(rgb.g));
        dst.write(scaler(rgb.b));
        dst.write(targetOpaque);
      },
    },
    [ChannelsYA]: {
      [ChannelsY]: () => {
        // TODO: source has alpha channel, Y should be blended onto reference background color using that alpha
        dst.write(scaler(src.read()));
        src.skip(1);
      },
      [ChannelsYA]: () => {
        dst.write(scaler(src.read()));
        dst.write(scaler(src.read()));
      },
      [ChannelsRGB]: () => {
        // TODO: source has alpha channel, RGB should be blended onto reference background color using that alpha
        const rgb = BT709.luma2rgb(src.read());
        dst.write(scaler(rgb.r));
        dst.write(scaler(rgb.g));
        dst.write(scaler(rgb.b));
        src.skip(1);
      },
      [ChannelsRGBA]: () => {
        const rgb = BT709.luma2rgb(src.read());
        dst.write(scaler(rgb.r));
        dst.write(scaler(rgb.g));
        dst.write(scaler(rgb.b));
        dst.write(scaler(src.read()));
      },
    },
    [ChannelsRGB]: {
      [ChannelsY]: () => {
        // TODO: allow custom RGB => Y converter function
        // TODO: use converter function from image-q
        const R = src.read();
        const G = src.read();
        const B = src.read();
        dst.write(scaler(BT709.rgb2luma(R, G, B)));
      },
      [ChannelsYA]: () => {
        const R = src.read();
        const G = src.read();
        const B = src.read();
        dst.write(scaler(BT709.rgb2luma(R, G, B)));
        dst.write(targetOpaque);
      },
      [ChannelsRGB]: () => {
        dst.write(scaler(src.read()));
        dst.write(scaler(src.read()));
        dst.write(scaler(src.read()));
      },
      [ChannelsRGBA]: () => {
        dst.write(scaler(src.read()));
        dst.write(scaler(src.read()));
        dst.write(scaler(src.read()));
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
        dst.write(scaler(BT709.rgb2luma(R, G, B)));
        src.skip(1);
      },
      [ChannelsYA]: () => {
        // TODO: allow custom RGB => Y converter function
        // TODO: use converter function from image-q
        const R = src.read();
        const G = src.read();
        const B = src.read();
        dst.write(scaler(BT709.rgb2luma(R, G, B)));
        dst.write(scaler(src.read()));
      },
      [ChannelsRGB]: () => {
        // TODO: source has alpha channel, RGB should be blended onto reference background color using that alpha
        dst.write(scaler(src.read()));
        dst.write(scaler(src.read()));
        dst.write(scaler(src.read()));
        src.skip(1);
      },
      [ChannelsRGBA]: () => {
        dst.write(scaler(src.read()));
        dst.write(scaler(src.read()));
        dst.write(scaler(src.read()));
        dst.write(scaler(src.read()));
      },
    },
  };

  return mappers;
}

export function toCustomImageData(
  sourceImage: ImageProps,
  {
    channelsMap = ChannelsRGBA,
    sampleDepth = 8,
    applyGamma = true,
    applyBackgroundColor = true,
  }: ToTypedArrayOptions = {},
) {
  const pixels = sourceImage.width * sourceImage.height;
  const targetData = sampleDepth === 16 ? new Uint16Array(pixels * channelsMap.length) : new Uint8Array(pixels * channelsMap.length);
  const gamma = applyGamma && typeof sourceImage.gamma === 'number' ? 1 / (2.2 * sourceImage.gamma) : 1;
// debugger;
  const targetOpaque = Colors.getOpaque(sampleDepth);
  const scale = getScaler(sourceImage.sampleDepth, sampleDepth, gamma);

  const mappers = getPixelMappers(
    new TypedArrayStream(sourceImage.channelsData),
    new TypedArrayStream(targetData),
    targetOpaque,
    scale,
  );

  const mapper = mappers[sourceImage.channelsMap][channelsMap];

  for (let index = 0; index < pixels; index++) {
    mapper();
  }

  if (typeof sourceImage.backgroundColor !== 'undefined') {
    // const src = new TypedArrayStream(sourceImage.channelsData);
    // const dst = new TypedArrayStream(targetData);
    
    // applyBackgroundColor(targetData, sourceImage.backgroundColor);
  }

  return targetData;
}
