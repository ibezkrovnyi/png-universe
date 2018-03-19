/**
 * DataView Stream
 * Always BIG ENDIAN (used to read/write PNG stream)
 * Use TypedArrayStream for Local Environment Endianess (used to read/write image data/canvas/etc on local machine)
 */
export class DataViewStream {
  private _currentOffset: number;
  private _dataView: Uint8Array;

  constructor(dataView: DataView | Uint8Array, byteOffset = 0, byteLength = dataView.byteLength) {
    this._dataView = new Uint8Array(dataView.buffer, dataView.byteOffset + byteOffset, byteLength);
    this._currentOffset = 0;
  }

  readText() {
    const text: string[] = [];
    let ch: number;
    while (ch = this._dataView[this._currentOffset++]) {
      text.push(String.fromCharCode(ch));
    }
    return text.join('');
  }

  readDataView(byteLength: number) {
    const dataView = new DataView(this._dataView.buffer, this._dataView.byteOffset + this._currentOffset, byteLength);
    this._currentOffset += byteLength;
    return dataView;
  }

  readUint(bits: number) {
    switch (bits) {
      case 8: return this.readUint8();
      case 16: return this.readUint16();
      case 32: return this.readUint32();
      default: throw new Error(`${bits} is unsupported`);
    }
  }

  readUint8() {
    return this._dataView[this._currentOffset++];
  }

  readUint16() {
    const high = this._dataView[this._currentOffset++];
    const low = this._dataView[this._currentOffset++];
    return (high << 8) + low;
    // const uint16 = this._dataView.getUint16(this._currentOffset);
    // this._currentOffset += 2;
    // return uint16;
  }

  readUint32() {
    const b4 = (this._dataView[this._currentOffset++] << 24) >>> 0;
    const b3 = this._dataView[this._currentOffset++] << 16;
    const b2 = this._dataView[this._currentOffset++] << 8;
    const b1 = this._dataView[this._currentOffset++];
    return b4 + b3 + b2 + b1;
    // const uint32 = this._dataView.getUint32(this._currentOffset);
    // this._currentOffset += 4;
    // return uint32;
  }

  /**
   * Make sure passed dataView is not from instance of Uint16Array / Uint32Array
   */
  writeDataView(dataView: DataView) {
    const byteLength = dataView.byteLength;
    const source = new Uint8Array(dataView.buffer, dataView.byteOffset, byteLength);
    const destination = new Uint8Array(this._dataView.buffer, this._dataView.byteOffset + this._currentOffset, byteLength);
    destination.set(source);

    this._currentOffset += byteLength;
  }

  writeUint8(value: number) {
    this._dataView[this._currentOffset++] = value;
  }

  writeUint16(value: number) {
    this._dataView[this._currentOffset++] = value >> 8;
    this._dataView[this._currentOffset++] = value & 255;
  }

  writeUint32(value: number) {
    this._dataView[this._currentOffset++] = value >>> 24;
    this._dataView[this._currentOffset++] = value >>> 16 & 255;
    this._dataView[this._currentOffset++] = value >>> 8 & 255;
    this._dataView[this._currentOffset++] = value & 255;
  }

  skip(byteLength: number) {
    this._currentOffset += byteLength;
  }

  rewind() {
    this._currentOffset = 0;
  }

  toUint8Array() {
    return new Uint8Array(this._dataView.buffer, this._dataView.byteOffset, this._dataView.byteLength);
  }

  toDataView() {
    return this._dataView;
  }

  get byteLength() {
    return this._dataView.byteLength;
  }

  get currentOffset() {
    return this._currentOffset;
  }
}
