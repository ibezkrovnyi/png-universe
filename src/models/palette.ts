import { Chunk } from '../format/chunks/chunk';
import { Colors } from '../format/constants';
import { DataViewStream } from '../utils/dataViewStream';
import { readText, assert, getUint } from '../utils';

export class Palette {
  static fromPLTE(bitDepth: number, PLTE: Chunk, tRNS?: Chunk) {
    const PLTEStream = new DataViewStream(PLTE.data);
    const maxColors = 2 ** bitDepth;
    const colors = Math.min(maxColors, PLTEStream.byteLength / 3 | 0);

    const tRNSStream = tRNS ? new DataViewStream(tRNS.data) : undefined;
    const paletteStream = new DataViewStream(new Uint8Array(colors * 4));
    for (let index = 0; index < colors; index++) {
      paletteStream.writeUint8(PLTEStream.readUint8());
      paletteStream.writeUint8(PLTEStream.readUint8());
      paletteStream.writeUint8(PLTEStream.readUint8());
      if (tRNSStream) {
        paletteStream.writeUint8(index < tRNSStream.byteLength ? tRNSStream.readUint8() : Colors.getOpaque(8));
      }
    }

    return new Palette('Default PLTE Palette', tRNS ? 'RGBA' : 'RGB', paletteStream.toUint8Array());
  }

  static fromSPLT(sPLT: Chunk) {
    const sPLTStream = new DataViewStream(sPLT.data);
    const name = sPLTStream.readText();
    const sampleDepth = sPLTStream.readUint8();
    assert([8, 16].includes(sampleDepth));

    const prefixLength = sPLTStream.currentOffset;

    const sampleBytes = sampleDepth / 8;
    const indexLength = 2 + 4 * sampleBytes;
    const colors = (sPLTStream.byteLength - prefixLength) / indexLength;

    const palette = sampleDepth === 8 ? new Uint8Array(colors * 4) : new Uint16Array(colors * 4);
    for (let index = 0; index < colors; index++) {
      palette[index * 4 + 0] = sPLTStream.readUint(sampleDepth);
      palette[index * 4 + 1] = sPLTStream.readUint(sampleDepth);
      palette[index * 4 + 2] = sPLTStream.readUint(sampleDepth);
      palette[index * 4 + 3] = sPLTStream.readUint(sampleDepth);
      sPLTStream.skip(2); // frequency
    }

    return new Palette(name, 'RGBA', palette);
  }

  get sampleDepth() {
    return this.channelsData.BYTES_PER_ELEMENT * 8 as 8 | 16;
  }

  private constructor(
    readonly name: string,
    readonly channelsMap: 'RGB' | 'RGBA',
    readonly channelsData: Uint8Array | Uint16Array,
  ) { }

  /**
   * Returns name of Palette, may be useful if mupltiple Palettes are available
   */
  // getName() {
  //   return this._name;
  // }

  /**
   * Returns number of colors in Palette
   */
  getColorsCount() {
    return this.channelsData.length / this.channelsMap.length;
  }

  getColor(colorIndex: number): [number, number, number] | [number, number, number, number] {
    const offset = colorIndex * this.channelsMap.length | 0;
    return this.channelsMap === 'RGB' ? [
      this.channelsData[offset],
      this.channelsData[offset + 1],
      this.channelsData[offset + 2],
    ] : [
      this.channelsData[offset],
      this.channelsData[offset + 1],
      this.channelsData[offset + 2],
      this.channelsData[offset + 3],
    ];
  }

  /**
   * Returns sample depth (bits per color/alpha channel)
   */
  // getSampleDepth() {
  //   return this.channelsData.BYTES_PER_ELEMENT * 8 as 8 | 16;
  // }

  /**
   * Returns object of Color interface by given index in Palette
   * @param index index in Palette
   */
  // getColor(index: number) {
  //   const base = index * 4;
  //   return {
  //     r: this.channelsData[base + 0],
  //     g: this.channelsData[base + 1],
  //     b: this.channelsData[base + 2],
  //     a: this.channelsData[base + 3],
  //   };
  // }
}
