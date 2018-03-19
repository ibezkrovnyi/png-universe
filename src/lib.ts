import { ChunkTypes, ChunkNames, signature, Colors } from './format/constants';
import { Chunk } from './format/chunks/chunk';
import { crc32 } from './format/crc';
import { readIHDR, IHDR, ColorTypeMasks, ColorTypes, ColorTypeMap } from './format/chunks/IHDR';
import { Palette } from './models/palette';
import { parseChunks } from './parser/parser';
import { assert } from './utils';
import { ImageProps, ChannelsY, ChannelsMap, ChannelsYA, ChannelsRGB, ChannelsRGBA } from './image/imageProps';
import { getChunksByType } from './parser/utils';
import { toCustomImageData, ToTypedArrayOptions } from './image/toCustomImageData';

export class PNGImage implements ImageProps {
  private _parsed: ReturnType<typeof parseChunks>;

  get width() {
    return this._parsed.info.width;
  }
  get height() {
    return this._parsed.info.height;
  }
  get bitDepth() {
    return this._parsed.info.bitDepth;
  }
  get sampleDepth() {
    return this._parsed.info.colorType === ColorTypes.IndexedColor ? this._parsed.palette!.sampleDepth : this._parsed.info.bitDepth;
  }
  get channelsMap() {
    const tRNS = getChunksByType(this._parsed.chunks, ChunkTypes.tRNS);
    const colorTypeToChannelMap: ColorTypeMap<() => ChannelsMap> = {
      [ColorTypes.GreyScale]: () => 'Y',
      [ColorTypes.GreyScaleWithAlpha]: () => 'YA',
      [ColorTypes.IndexedColor]: () => this._parsed.palette!.channelsMap,
      [ColorTypes.TrueColor]: () => 'RGB',
      [ColorTypes.TrueColorWithAlpha]: () => 'RGBA',
    };
    return colorTypeToChannelMap[this._parsed.info.colorType]();
  }

  get channelsData() {
    return this._parsed.bitmap;
  }

  get palette() {
    return this._parsed.palette;
  }

  get gamma() {
    return this._parsed.gamma;
  }

  /**
   * Always 8 bit per channel RGBA
   */
  toCustomImageData(targetFormat?: ToTypedArrayOptions) {
    return toCustomImageData(this, targetFormat);
  }

  static fromFile(data: Uint8Array) {
    return PNGImage.fromPNGDataStream(data);
  }

  static fromPNGDataStream(data: Uint8Array) {
    return new PNGImage(data);
  }

  private constructor(data: Uint8Array) {
    const chunks: Chunk[] = [];

    const dataView = new DataView(data.buffer);
    this.checkSignature(dataView);

    let offset = signature.length;
    while (true) {
      const chunk = this.readChunk(new DataView(data.buffer, data.byteOffset + offset));
      offset += chunk.data.byteLength + 12;

      if (chunks.length === 0 && chunk.type !== ChunkTypes.IHDR) {
        throw new Error('(spec) Expected chunk IHDR on beggining');
      }
      chunks.push(chunk);

      if (chunk.type === ChunkTypes.IEND) break;
    }

    this._parsed = parseChunks(chunks);
  }

  getInfo() {
    return this._parsed.info;
  }

  getPalette() {
    return this._parsed.palette;
  }

  getSuggestedPalettes() {
    return this._parsed.suggestedPalettes;
  }

  private checkSignature(dataView: DataView) {
    const byteLength = signature.length;
    for (let offset = 0; offset < byteLength; offset++) {
      if (dataView.getUint8(offset) !== signature[offset]) throw new Error(`(spec) Wrong PNG signature`);
    }
  }

  private readChunk(dataView: DataView) {
    const byteLength = dataView.getUint32(0);
    const type = dataView.getUint32(4);
    const name = [4, 5, 6, 7].map(offset => String.fromCharCode(dataView.getUint8(offset))).join('');

    // crc applied to type & data
    const crc = crc32(dataView, 4, 4 + byteLength);
    if (crc !== dataView.getUint32(8 + byteLength)) throw new Error(`(spec) Crc error for chunk type ${name} (${crc}, ${dataView.getUint32(8 + byteLength)})`);
    console.log(`crc ok for chunk ${name}`);

    return {
      type,
      name,
      data: new DataView(dataView.buffer, 8 + dataView.byteOffset, byteLength),
      flags: {
        ancillary: !!(dataView.getUint8(4) & 0x20),  // or critical
        private: !!(dataView.getUint8(5) & 0x20),  // or unsafe
        safeToCopy: !!(dataView.getUint8(7) & 0x20),  // or unsafe
      },
    };
  }
}
