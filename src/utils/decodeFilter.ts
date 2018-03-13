import { IHDR, ColorTypes } from "../format/chunks/IHDR";
import { DataViewStream } from "./stream";

export enum FilterType {
    None = 0,
    Sub = 1,
    Up = 2,
    Avg = 3,
    Paeth = 4,
}

var pixelBppMap = {
    1: { // L
        0: 0,
        1: 0,
        2: 0,
        3: 0xff
    },
    2: { // LA
        0: 0,
        1: 0,
        2: 0,
        3: 1
    },
    3: { // RGB
        0: 0,
        1: 1,
        2: 2,
        3: 0xff
    },
    4: { // RGBA
        0: 0,
        1: 1,
        2: 2,
        3: 3
    }
} as any;

// TODO: bytes per pixel (pixel contains number of channels, so, 8bit rgba = 1x4=4, 16bit rgb = 2x3 = 6, etc)
const colorTypeToBppMap = {
    0: 1,
    2: 3,
    3: 1,
    4: 2,
    6: 4
} as any;


class Filter {
    _filterTypes: (0 | 1 | 2 | 3 | 4)[];
    _width: number;
    _height: number;
    _Bpp: any;
    _data: Uint8Array;
    _line: number;
    _filters: any[];
    constructor(IHDR: IHDR, inData: Uint8Array, filterTypes: (0|1|2|3|4)[] = [0, 1, 2, 3, 4]) {

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
            this._filterPaeth.bind(this)
        ];
    }

    filter() {

        var pxData = this._data,
            rawData = new Buffer((this._width * this._Bpp + 1) * this._height);

        for (var y = 0; y < this._height; y++) {

            // find best filter for this line (with lowest sum of values)
            var filterTypes = this._filterTypes,
                min = Infinity,
                sel = 0;

            for (var i = 0; i < filterTypes.length; i++) {
                var sum = this._filters[filterTypes[i]](pxData, y, null);
                if (sum < min) {
                    sel = filterTypes[i];
                    min = sum;
                }
            }

            this._filters[sel](pxData, y, rawData);
        }
        return rawData;
    };

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
            for (var x = 0; x < pxRowLength; x++)
                sum += Math.abs(pxData[y * pxRowLength + x]);

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

        if (rawData)
            rawData[y * rawRowLength] = 1;

        for (var x = 0; x < pxRowLength; x++) {

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

        if (rawData)
            rawData[y * rawRowLength] = 2;

        for (var x = 0; x < pxRowLength; x++) {

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

        if (rawData)
            rawData[y * rawRowLength] = 3;

        for (var x = 0; x < pxRowLength; x++) {

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

        if (rawData)
            rawData[y * rawRowLength] = 4;

        for (var x = 0; x < pxRowLength; x++) {

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
    _scanLineByteLength: number;
    _IHDR: IHDR;
    outData: Uint8Array;
    _readOffset: number;
    _inData: Uint8Array;
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
        this._scanLineByteLength = Math.ceil(IHDR.width * bytesPerPixel);

        this._readOffset = 0;
        this.outData = new Uint8Array(IHDR.height * this._scanLineByteLength);

        const unfilteredStream = new DataViewStream(inData);
        for (let line = 0; line < IHDR.height; line++) {
            this._reverseFilterLine(line, unfilteredStream);
        }
        
    }

    _reverseFilterLine(line: number, unfilteredStream: DataViewStream) {
        const filter = unfilteredStream.readUint8();
        const outRowPos = line * this._scanLineByteLength;
        
        switch (filter) {
            case FilterType.None:
                for(let i = 0; i < this._scanLineByteLength; i++) {
                    this.outData[outRowPos + i] = unfilteredStream.readUint8();
                }
                break;

            case FilterType.Sub:
                for(let i = 0; i < this._scanLineByteLength; i++) {
                    const left = i > 0 ? this.outData[outRowPos + i - 1] : 0;
                    this.outData[outRowPos + i] = unfilteredStream.readUint8() + left;
                }
                break;

            case FilterType.Up:
                for(let i = 0; i < this._scanLineByteLength; i++) {
                    const up = line > 0 ? this.outData[outRowPos - this._scanLineByteLength + i] : 0;
                    this.outData[outRowPos + i] = unfilteredStream.readUint8() + up;
                }
                break;

            case FilterType.Avg:
                for(let i = 0; i < this._scanLineByteLength; i++) {
                    const left = i > 0 ? this.outData[outRowPos + i - 1] : 0;
                    const up = line > 0 ? this.outData[outRowPos - this._scanLineByteLength + i] : 0;
                    const add = Math.floor((left + up) / 2);
                    this.outData[outRowPos + i] = unfilteredStream.readUint8() + add;
                }
                break;

            case FilterType.Paeth:
                for(let i = 0; i < this._scanLineByteLength; i++) {
                    const left = i > 0 ? this.outData[outRowPos + i - 1] : 0;
                    const up = line > 0 ? this.outData[outRowPos - this._scanLineByteLength + i] : 0;
                    const upLeft = i > 0 && line > 0 ? this.outData[outRowPos - this._scanLineByteLength - 1 + i] : 0;
                    const add = PaethPredictor(left, up, upLeft);
                    this.outData[outRowPos + i] = unfilteredStream.readUint8() + add;
                }
                break;
        }
    };
}



var PaethPredictor = function (left: number, above: number, upLeft: number) {

    var p = left + above - upLeft,
        pLeft = Math.abs(p - left),
        pAbove = Math.abs(p - above),
        pUpLeft = Math.abs(p - upLeft);

    if (pLeft <= pAbove && pLeft <= pUpLeft) return left;
    else if (pAbove <= pUpLeft) return above;
    else return upLeft;
};
