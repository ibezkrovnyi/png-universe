import { Chunk } from "../format/chunks/chunk";
import { Colors } from "../format/chunks/constants";
import { readText, assert, getUint } from "../utils";

export class Palette {
  static fromPLTE(bitDepth: number, PLTE: Chunk, tRNS?: Chunk) {
    const plteChunkData = PLTE.data;
    const maxColors = 2 ** bitDepth;
    const colors = Math.min(maxColors, plteChunkData.byteLength / 3 | 0);

    const palette = new Uint8Array(colors * 4);
    for (let index = 0; index < colors; index++) {
      palette[index * 4] = plteChunkData.getUint8(index * 3);
      palette[index * 4 + 1] = plteChunkData.getUint8(index * 3 + 1);
      palette[index * 4 + 2] = plteChunkData.getUint8(index * 3 + 2);
      palette[index * 4 + 3] = Colors.Opaque255;
    }

    if (tRNS) {
      const alphaChunkData = tRNS.data;
      const alphaColors = Math.min(colors, alphaChunkData.byteLength);
      for (let index = 0; index < alphaColors; index++) {
        palette[index * 4 + 3] = alphaChunkData.getUint8(index);
      }
    }

    return new Palette('Default PLTE Palette', palette);
  }

  static fromSPLT(sPLT: Chunk) {
    const spltChunkData = sPLT.data;
    const name = readText(spltChunkData, 0);
    
    // +1 because text is followed by 'null' symbol, +1 for sampleDepth
    let prefixLength = name.length + 1 + 1;
    const sampleDepth = spltChunkData.getUint8(name.length + 1);
    assert([8, 16].includes(sampleDepth));
    
    const sampleBytes = sampleDepth / 2;
    const indexLength = 2 + 4 * sampleBytes;
    const colors = (spltChunkData.byteLength - prefixLength) / indexLength;

    let palette = sampleDepth === 8 ? new Uint8Array(colors * 4) : new Uint16Array(colors * 4);
    for (let index = 0; index < colors; index++) {
      const base = prefixLength + index * indexLength;
      palette[index * 4 + 0] = getUint(spltChunkData, base + 0 * sampleBytes, sampleDepth);
      palette[index * 4 + 1] = getUint(spltChunkData, base + 1 * sampleBytes, sampleDepth);
      palette[index * 4 + 2] = getUint(spltChunkData, base + 2 * sampleBytes, sampleDepth);
      palette[index * 4 + 3] = getUint(spltChunkData, base + 3 * sampleBytes, sampleDepth);
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