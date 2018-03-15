import { IHDR, ColorTypes } from "../format/chunks/IHDR";
import { Palette } from "./palette";
import { Colors } from "../format/constants";
import { assertT } from "../utils";
import { DataViewStream } from "../utils/dataViewStream";
import { DataViewBitStream } from "../utils/dataViewBitStream";
import { Color3D, Color1D } from "./color";

export class Bitmap {
  constructor(
    private _IHDR: IHDR,
    private _data: Uint8Array,
    private _singleTransparentColor?: Color1D | Color3D,
    private _palette?: Palette
  ) { }

  toRGBA() {
    switch (this._IHDR.colorType) {
      case ColorTypes.GreyScale:
        return this._greyscaleToRGBA(false);

      case ColorTypes.TrueColor:
        return this._trueColorToRGBA(false);

      case ColorTypes.IndexedColor:
        return this._indexedToRGBA();

      case ColorTypes.GreyScaleWithAlpha:
        return this._greyscaleToRGBA(true);

      case ColorTypes.TrueColorWithAlpha:
        return this._trueColorToRGBA(true);
    }
  }

  private _createRGBATypedArray() {
    // for 16bit sampleDepth Uint16Array is used, for any other sampleDepth (1,2,4,8) Uint8Array should be used
    const Contructor = this._IHDR.sampleDepth === 16 ? Uint16Array : Uint8Array;
    const pixels = this._IHDR.width * this._IHDR.height;
    return new Contructor(this._IHDR.width * this._IHDR.height * 4)
  }

  private _greyscaleToRGBA(alphaChannel: boolean) {
    const inStream = new DataViewBitStream(this._data);
    const out = this._createRGBATypedArray();

    const { width, height } = this._IHDR;
    // const pixels = this._IHDR.width * this._IHDR.height;
    for (let y = 0, index = 0; y < height; y++) {
      for (let x = 0; x < width; x++, index++) {
        const grey = inStream.readUint(this._IHDR.bitDepth);
        out[index * 4 + 0] = grey;
        out[index * 4 + 1] = grey;
        out[index * 4 + 2] = grey;
        out[index * 4 + 3] = alphaChannel ? inStream.readUint(this._IHDR.bitDepth) : Colors.getOpaque(this._IHDR.bitDepth);
      }
      if (y !== height - 1) inStream.nextByte();
    }
    // for (let index = 0; index < pixels; index++) {
    //   const grey = inStream.readUint(this._IHDR.bitDepth);
    //   out[index * 4 + 0] = grey;
    //   out[index * 4 + 1] = grey;
    //   out[index * 4 + 2] = grey;
    //   out[index * 4 + 3] = alphaChannel ? inStream.readUint(this._IHDR.bitDepth) : Colors.getOpaque(this._IHDR.bitDepth);
    // }

    return out;
  }

  private _trueColorToRGBA(alphaChannel: boolean) {
    assertT([8, 16].includes(this._IHDR.bitDepth), `incorrect bit depth ${this._IHDR.bitDepth}`)

    const pixels = this._IHDR.width * this._IHDR.height;
    const out = this._createRGBATypedArray();
    const stream = new DataViewStream(this._data);
    for (let index = 0; index < pixels; index++) {
      out[index * 4 + 0] = stream.readUint(this._IHDR.bitDepth);
      out[index * 4 + 1] = stream.readUint(this._IHDR.bitDepth);
      out[index * 4 + 2] = stream.readUint(this._IHDR.bitDepth);
      out[index * 4 + 3] = alphaChannel ? stream.readUint(this._IHDR.bitDepth) : Colors.getOpaque(this._IHDR.bitDepth);
    }
    return out;
  }

  private _indexedToRGBA() {
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