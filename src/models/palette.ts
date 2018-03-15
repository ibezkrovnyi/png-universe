import { Chunk } from "../format/chunks/chunk";
import { Colors } from "../format/constants";
import { DataViewStream } from "../utils/dataViewStream";
import { readText, assert, getUint } from "../utils";

export class Palette {
  static fromPLTE(bitDepth: number, PLTE: Chunk, tRNS?: Chunk) {
    const PLTEStream = new DataViewStream(PLTE.data);
    const maxColors = 2 ** bitDepth;
    const colors = Math.min(maxColors, PLTEStream.byteLength / 3 | 0);

    const paletteStream = new DataViewStream(new Uint8Array(colors * 4));
    for (let index = 0; index < colors; index++) {
      paletteStream.writeUint8(PLTEStream.readUint8());
      paletteStream.writeUint8(PLTEStream.readUint8());
      paletteStream.writeUint8(PLTEStream.readUint8());
      paletteStream.writeUint8(Colors.getOpaque(8));
    }

    if (tRNS) {
      const tRNSStream = new DataViewStream(tRNS.data);
      const alphaColors = Math.min(colors, tRNSStream.byteLength);
      
      paletteStream.rewind();
      for (let index = 0; index < alphaColors; index++) {
        paletteStream.skip(3);
        paletteStream.writeUint8(tRNSStream.readUint8());
      }
    }

    return new Palette('Default PLTE Palette', paletteStream.toUint8Array());
  }

  static fromSPLT(sPLT: Chunk) {
    const sPLTStream = new DataViewStream(sPLT.data);
    const name = sPLTStream.readText();
    const sampleDepth = sPLTStream.readUint8();
    assert([8, 16].includes(sampleDepth));

    let prefixLength = sPLTStream.currentOffset;
    
    const sampleBytes = sampleDepth / 8;
    const indexLength = 2 + 4 * sampleBytes;
    const colors = (sPLTStream.byteLength - prefixLength) / indexLength;

    let palette = sampleDepth === 8 ? new Uint8Array(colors * 4) : new Uint16Array(colors * 4);
    for (let index = 0; index < colors; index++) {
      palette[index * 4 + 0] = sPLTStream.readUint(sampleDepth);
      palette[index * 4 + 1] = sPLTStream.readUint(sampleDepth);
      palette[index * 4 + 2] = sPLTStream.readUint(sampleDepth);
      palette[index * 4 + 3] = sPLTStream.readUint(sampleDepth);
      sPLTStream.skip(2); // frequency
    }

    return new Palette(name, palette);
  }

  private constructor(
    private _name: string, 
    private _data: Uint8Array | Uint16Array
  ) {}

  /**
   * Returns name of Palette, may be useful if mupltiple Palettes are available
   */
  getName() {
    return this._name;
  }

  /**
   * Returns number of colors in Palette
   */
  getColorsCount() {
    return this._data.length;
  }

  /**
   * Returns sample depth (bits per color/alpha channel)
   */
  getSampleDepth() {
    return this._data.BYTES_PER_ELEMENT * 8;
  }

  /**
   * Returns object of Color interface by given index in Palette
   * @param index index in Palette
   */
  getColor(index: number) {
    const base = index * 4;
    return {
      r: this._data[base + 0],
      g: this._data[base + 1],
      b: this._data[base + 2],
      a: this._data[base + 3],
    };
  }
}