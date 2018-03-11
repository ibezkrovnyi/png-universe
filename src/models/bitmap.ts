import { IHDR, ColorTypes } from "../format/chunks/IHDR";
import { Palette } from "./palette";

export class Bitmap {
  constructor(
    private _IHDR: IHDR,
    private _data: Uint8Array | Uint16Array,
    private _palette: Palette
  ) {}

  toImageData() {
    const pixels = this._IHDR.width * this._IHDR.height;
    const data = new Uint8Array(pixels * 4);
    switch(this._IHDR.colorType) {
      case ColorTypes.TrueColor:
        for(let index = 0; index < pixels; index++) {
          const color = this._palette.getColor(this._data[index]);
          data[index*4 + 0] = color.r;
          data[index*4 + 1] = color.g;
          data[index*4 + 2] = color.b;
          data[index*4 + 3] = color.a;
        }
        break;
      case ColorTypes.IndexedColor:
        for(let index = 0; index < pixels; index++) {
          const color = this._palette.getColor(this._data[index]);
          data[index*4 + 0] = color.r;
          data[index*4 + 1] = color.g;
          data[index*4 + 2] = color.b;
          data[index*4 + 3] = color.a;
        }
        break;
    }
    return {
      width: this._IHDR.width,
      height: this._IHDR.height,
      data,
    };
  }
}