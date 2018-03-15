const bitsToMask = [0, 1, 3, 7, 15, 31, 63, 127, 255];
const reverseBitsInByte = Array.from({ length: 256 }).map((_, b) => {
    b = (b & 0xF0) >> 4 | (b & 0x0F) << 4;
   b = (b & 0xCC) >> 2 | (b & 0x33) << 2;
   b = (b & 0xAA) >> 1 | (b & 0x55) << 1;
   return b;
})

/**
 * DataView Stream
 * Always BIG ENDIAN (used to read/write PNG stream)
 * Use TypedArrayStream for Local Environment Endianess (used to read/write image data/canvas/etc on local machine)
 */
export class DataViewBitStream {
  _currentByte: number;
  private _currentOffset: number;
  private _bitsLeftInByte: number;
  private _dataView: DataView;
  
  constructor(dataView: DataView | Uint8Array, byteOffset = 0, byteLength?: number) {
    this._dataView = new DataView(dataView.buffer, dataView.byteOffset + byteOffset, byteLength);
    this._currentOffset = -1;
    this._bitsLeftInByte = 0;
    this._currentByte = 0;
  }

  nextByte() {
    this._bitsLeftInByte = 8;
    this._currentOffset++;
    this._currentByte = this._dataView.getUint8(this._currentOffset);
  }

  /**
   * Always begin from byte boundary
   */
  readText() {
    if (this._bitsLeftInByte < 8) this.nextByte();

    const text: string[] = [];
    let ch: number;
    while (ch = this._dataView.getUint8(this._currentOffset++)) {
      text.push(String.fromCharCode(ch));
    }
    return text.join('');
  }

  /**
   * Always begin from byte boundary
   */
  readDataView(byteLength: number) {
    if (this._bitsLeftInByte < 8) this.nextByte();

    const dataView = new DataView(this._dataView.buffer, this._dataView.byteOffset + this._currentOffset, byteLength);
    this._currentOffset += byteLength;
    return dataView;
  }

  readUint(totalBitsToRead: number) {
    let value = 0;
    let bitsRead = 0;
    while(totalBitsToRead > 0) {
      if (this._bitsLeftInByte === 0) this.nextByte();

      const bitsToRead = Math.min(this._bitsLeftInByte, totalBitsToRead);
      const bits = (this._currentByte >> (this._bitsLeftInByte - 1)) & bitsToMask[bitsToRead];

      value += reverseBitsInByte[bits] * (2 ** bitsRead);
      bitsRead += bitsToRead;
      
      this._bitsLeftInByte -= bitsToRead;

      totalBitsToRead -= bitsToRead;
    }

    return value;
  }

  readUint8() {
    return this.readUint(8);
  }

  readUint16() {
    return this.readUint(16);
  }

  readUint32() {
    return this.readUint(32);
  }
}