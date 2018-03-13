import { IHDR, ColorTypes } from "../format/chunks/IHDR";
import { Palette } from "./palette";
import { Colors } from "../format/chunks/constants";

export class Bitmap {
  constructor(
    private _IHDR: IHDR,
    private _data: Uint8Array | Uint16Array,
    private _palette?: Palette
  ) { }

  toImageData() {
    switch (this._IHDR.colorType) {
      // TODO: other color types?
      case ColorTypes.TrueColor:
        // TODO: different Sample depth?
        return this._trueColorToImageData();

      case ColorTypes.TrueColorWithAlpha:
        // TODO: different Sample depth?
        return this._data;

      case ColorTypes.IndexedColor:
        return this._indexedToImageData();
    }
  }

  private _trueColorToImageData() {
    const pixels = this._IHDR.width * this._IHDR.height;
    const data = new Uint8Array(pixels * 4);
    for (let index = 0; index < pixels; index++) {
      data[index * 4 + 0] = this._data[index * 3 + 0];
      data[index * 4 + 1] = this._data[index * 3 + 1];
      data[index * 4 + 2] = this._data[index * 3 + 2];
      data[index * 4 + 3] = Colors.Opaque255;
    }
    return data;
  }

  private _indexedToImageData() {
    if (!this._palette) throw new Error('palette not found');
    const pixels = this._IHDR.width * this._IHDR.height;
    const data = new Uint8Array(pixels * 4);
    const bytesPerIndex = this._IHDR.bitDepth / 8;
    const lineByteLength = Math.ceil(this._IHDR.width * bytesPerIndex);
    switch (this._IHDR.bitDepth) {
      case 1:
      case 2:
      case 4:
        const pixelsPerByte = 8 / this._IHDR.bitDepth;
        const indexMask = (2 ** this._IHDR.bitDepth) - 1;
        for (let y = 0; y < this._IHDR.height; y++) {
          for (let x = 0; x < this._IHDR.width; x += pixelsPerByte) {
            let srcByteOffset = lineByteLength * y + x / pixelsPerByte;
            const uint8 = this._data[srcByteOffset];

            for (let pixelInGroup = 0; pixelInGroup < pixelsPerByte; pixelInGroup++) {
              const dstBase = (y * this._IHDR.width + x + (pixelsPerByte - 1 - pixelInGroup)) * 4;
              const colorIndex = (uint8 >> (pixelInGroup * this._IHDR.bitDepth)) & indexMask;
              const color = this._palette.getColor(colorIndex);
              data[dstBase + 0] = color.r;
              data[dstBase + 1] = color.g;
              data[dstBase + 2] = color.b;
              data[dstBase + 3] = color.a;
            }
          }
        }
        break;

      // case 2:
      //   for (let y = 0; y < this._IHDR.height; y++) {
      //     for (let x = 0; x < this._IHDR.width; x += 4) {
      //       let srcByteOffset = lineByteLength * y + x / 4;
      //       const uint8 = this._data[srcByteOffset];

      //       for (let pixelInGroup = 0; pixelInGroup < 4; pixelInGroup++) {
      //         const dstBase = (y * this._IHDR.width + x + (3 - pixelInGroup)) * 4;
      //         const colorIndex = (uint8 >> (pixelInGroup * 2)) & 3;
      //         const color = this._palette.getColor(colorIndex);
      //         data[dstBase + 0] = color.r;
      //         data[dstBase + 1] = color.g;
      //         data[dstBase + 2] = color.b;
      //         data[dstBase + 3] = color.a;
      //       }
      //     }
      //   }
      //   break;

      // case 4:
      //   for (let y = 0; y < this._IHDR.height; y++) {
      //     for (let x = 0; x < this._IHDR.width; x += 2) {
      //       let srcByteOffset = lineByteLength * y + x / 2;
      //       const uint8 = this._data[srcByteOffset];

      //       for (let pixelInGroup = 0; pixelInGroup < 2; pixelInGroup++) {
      //         const dstBase = (y * this._IHDR.width + x + (1 - pixelInGroup)) * 4;
      //         const colorIndex = (uint8 >> (pixelInGroup * 4)) & 15;
      //         const color = this._palette.getColor(colorIndex);
      //         data[dstBase + 0] = color.r;
      //         data[dstBase + 1] = color.g;
      //         data[dstBase + 2] = color.b;
      //         data[dstBase + 3] = color.a;
      //       }
      //     }
      //   }
      //   break;

      case 8:
        for (let index = 0; index < pixels; index++) {
          const color = this._palette.getColor(this._data[index]);
          data[index * 4 + 0] = color.r;
          data[index * 4 + 1] = color.g;
          data[index * 4 + 2] = color.b;
          data[index * 4 + 3] = color.a;
        }
        break;
    }
    return data;
  }
}