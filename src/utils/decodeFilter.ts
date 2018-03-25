import { IHDR, ColorTypes } from '../format/chunks/IHDR';
import { DataViewStream } from './dataViewStream';

export enum FilterType {
  None = 0,
  Sub = 1,
  Up = 2,
  Avg = 3,
  Paeth = 4,
}

let pixelBppMap = {
  1: { // L
    0: 0,
    1: 0,
    2: 0,
    3: 0xff,
  },
  2: { // LA
    0: 0,
    1: 0,
    2: 0,
    3: 1,
  },
  3: { // RGB
    0: 0,
    1: 1,
    2: 2,
    3: 0xff,
  },
  4: { // RGBA
    0: 0,
    1: 1,
    2: 2,
    3: 3,
  },
} as any;

// TODO: bytes per pixel (pixel contains number of channels, so, 8bit rgba = 1x4=4, 16bit rgb = 2x3 = 6, etc)
const colorTypeToBppMap = {
  0: 1,
  2: 3,
  3: 1,
  4: 2,
  6: 4,
} as any;

class Filter {
  _filterTypes: Array<0 | 1 | 2 | 3 | 4>;
  _width: number;
  _height: number;
  _Bpp: any;
  _data: Uint8Array;
  _line: number;
  _filters: any[];
  constructor(IHDR: IHDR, inData: Uint8Array, filterTypes: Array<0 | 1 | 2 | 3 | 4> = [0, 1, 2, 3, 4]) {

    this._width = IHDR.width;
    this._height = IHDR.height;
    this._Bpp = colorTypeToBppMap[IHDR.colorType];
    this._data = inData;
    this._filterTypes = filterTypes;

    this._line = 0;

    this._filters = [
      this._filterNone.bind(this),
      this._filterSub.bind(this),
      this._filterUp.bind(this),
      this._filterAvg.bind(this),
      this._filterPaeth.bind(this),
    ];
  }

  filter() {

    var pxData = this._data,
      rawData = new Buffer((this._width * this._Bpp + 1) * this._height);

    for (let y = 0; y < this._height; y++) {

      // find best filter for this line (with lowest sum of values)
      var filterTypes = this._filterTypes,
        min = Infinity,
        sel = 0;

      for (let i = 0; i < filterTypes.length; i++) {
        var sum = this._filters[filterTypes[i]](pxData, y, null);
        if (sum < min) {
          sel = filterTypes[i];
          min = sum;
        }
      }

      this._filters[sel](pxData, y, rawData);
    }
    return rawData;
  }

  _copy(dst: Uint8Array, dstOffset: number, src: Uint8Array, srcOffset: number, length: number) {
    for (let i = 0; i < length; i++) {
      dst[dstOffset + i] = src[srcOffset + i];
    }
  }

  _filterNone(pxData: Uint8Array, y: number, rawData: Uint8Array) {

    var pxRowLength = this._width * this._Bpp,
      rawRowLength = pxRowLength + 1,
      sum = 0;

    if (!rawData) {
      for (let x = 0; x < pxRowLength; x++) {
        sum += Math.abs(pxData[y * pxRowLength + x]);
      }

    } else {
      rawData[y * rawRowLength] = 0;
      this._copy(rawData, rawRowLength * y + 1, pxData, pxRowLength * y, pxRowLength);
    }

    return sum;
  }

  _filterSub(pxData: Uint8Array, y: number, rawData: Uint8Array) {

    var pxRowLength = this._width * this._Bpp,
      rawRowLength = pxRowLength + 1,
      sum = 0;

    if (rawData) {
      rawData[y * rawRowLength] = 1;
    }

    for (let x = 0; x < pxRowLength; x++) {

      var left = x >= 4 ? pxData[y * pxRowLength + x - 4] : 0,
        val = pxData[y * pxRowLength + x] - left;

      if (!rawData) sum += Math.abs(val);
      else rawData[y * rawRowLength + 1 + x] = val;
    }
    return sum;
  }

  _filterUp(pxData: Uint8Array, y: number, rawData: Uint8Array) {

    var pxRowLength = this._width * this._Bpp,
      rawRowLength = pxRowLength + 1,
      sum = 0;

    if (rawData) {
      rawData[y * rawRowLength] = 2;
    }

    for (let x = 0; x < pxRowLength; x++) {

      var up = y > 0 ? pxData[(y - 1) * pxRowLength + x] : 0,
        val = pxData[y * pxRowLength + x] - up;

      if (!rawData) sum += Math.abs(val);
      else rawData[y * rawRowLength + 1 + x] = val;
    }
    return sum;
  }

  _filterAvg(pxData: Uint8Array, y: number, rawData: Uint8Array) {

    var pxRowLength = this._width * this._Bpp,
      rawRowLength = pxRowLength + 1,
      sum = 0;

    if (rawData) {
      rawData[y * rawRowLength] = 3;
    }

    for (let x = 0; x < pxRowLength; x++) {

      var left = x >= 4 ? pxData[y * pxRowLength + x - 4] : 0,
        up = y > 0 ? pxData[(y - 1) * pxRowLength + x] : 0,
        val = pxData[y * pxRowLength + x] - ((left + up) >> 1);

      if (!rawData) sum += Math.abs(val);
      else rawData[y * rawRowLength + 1 + x] = val;
    }
    return sum;
  }

  _filterPaeth(pxData: Uint8Array, y: number, rawData: Uint8Array) {

    var pxRowLength = this._width * this._Bpp,
      rawRowLength = pxRowLength + 1,
      sum = 0;

    if (rawData) {
      rawData[y * rawRowLength] = 4;
    }

    for (let x = 0; x < pxRowLength; x++) {

      var left = x >= 4 ? pxData[y * pxRowLength + x - 4] : 0,
        up = y > 0 ? pxData[(y - 1) * pxRowLength + x] : 0,
        upLeft = x >= 4 && y > 0 ? pxData[(y - 1) * pxRowLength + x - 4] : 0,
        val = pxData[y * pxRowLength + x] - PaethPredictor(left, up, upLeft);

      if (!rawData) sum += Math.abs(val);
      else rawData[y * rawRowLength + 1 + x] = val;
    }
    return sum;
  }
}

export class ReverseFilter {
  dst: Uint8Array;
  private _dstBytesPerPixel: number;
  private _scanLineByteLength: number;
  private _IHDR: IHDR;
  private _readOffset: number;
  private _inData: Uint8Array;
  constructor(inData: Uint8Array, IHDR: IHDR) {
    this._IHDR = IHDR;
    this._inData = inData;

    const bytesPerSample = this._IHDR.bitDepth / 8;
    let bytesPerPixel;
    switch (IHDR.colorType) {
      case ColorTypes.GreyScale:
        bytesPerPixel = bytesPerSample;
        break;
      case ColorTypes.TrueColor:
        bytesPerPixel = bytesPerSample * 3;
        break;
      case ColorTypes.IndexedColor:
        bytesPerPixel = bytesPerSample;
        break;
      case ColorTypes.GreyScaleWithAlpha:
        bytesPerPixel = bytesPerSample * 2;
        break;
      case ColorTypes.TrueColorWithAlpha:
        bytesPerPixel = bytesPerSample * 4;
        break;
      default:
        throw new Error();
    }
    this._dstBytesPerPixel = bytesPerPixel;
    this._scanLineByteLength = Math.ceil(IHDR.width * bytesPerPixel);

    this._readOffset = 0;
    this.dst = new Uint8Array(IHDR.height * this._scanLineByteLength);

    const unfilteredStream = new DataViewStream(inData);
    for (let line = 0; line < IHDR.height; line++) {
      this._reverseFilterLine(line, unfilteredStream);
    }

  }

  _reverseFilterLine(line: number, unfilteredStream: DataViewStream) {
    const filter = unfilteredStream.readUint8();
    const dstOffset = line * this._scanLineByteLength;
    const Bpp = Math.max(this._dstBytesPerPixel, 1);

    switch (filter) {
      case FilterType.None:
        for (let i = 0; i < this._scanLineByteLength; i++) {
          this.dst[dstOffset + i] = unfilteredStream.readUint8();
        }
        break;

      case FilterType.Sub:
        for (let i = 0; i < this._scanLineByteLength; i++) {
          const left = i >= Bpp ? this.dst[dstOffset + i - Bpp] : 0;
          this.dst[dstOffset + i] = unfilteredStream.readUint8() + left;
        }
        break;

      case FilterType.Up:
        for (let i = 0; i < this._scanLineByteLength; i++) {
          const up = line > 0 ? this.dst[dstOffset - this._scanLineByteLength + i] : 0;
          this.dst[dstOffset + i] = unfilteredStream.readUint8() + up;
        }
        break;

      case FilterType.Avg:
        for (let i = 0; i < this._scanLineByteLength; i++) {
          const left = i >= Bpp ? this.dst[dstOffset + i - Bpp] : 0;
          const up = line > 0 ? this.dst[dstOffset - this._scanLineByteLength + i] : 0;
          const add = Math.floor((left + up) / 2);
          this.dst[dstOffset + i] = unfilteredStream.readUint8() + add;
        }
        break;

      case FilterType.Paeth:
        for (let i = 0; i < this._scanLineByteLength; i++) {
          const outBytePos = dstOffset + i;
          const left = i >= Bpp ? this.dst[outBytePos - Bpp] : 0;
          const up = line > 0 ? this.dst[outBytePos - this._scanLineByteLength] : 0;
          const upLeft = i >= Bpp && line > 0 ? this.dst[outBytePos - this._scanLineByteLength - Bpp] : 0;
          const add = PaethPredictor(left, up, upLeft);
          const tmp = unfilteredStream.readUint8() + add;
          this.dst[outBytePos] = tmp;
        }
        break;
    }
  }
}

var PaethPredictor = function (left: number, up: number, upLeft: number) {
  var p = left + up - upLeft,
    pLeft = Math.abs(p - left),
    pUp = Math.abs(p - up),
    pUpLeft = Math.abs(p - upLeft);

  if (pLeft <= pUp && pLeft <= pUpLeft) return left;
  else if (pUp <= pUpLeft) return up;
  else return upLeft;
};
