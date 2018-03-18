/**
 * TypedArray Stream for Local Environment Endianess (used to read/write image data/canvas/etc on local machine)
 * Endianess depends on local environment
 * Use DataViewStream for Always BIG ENDIAN (used to read/write PNG stream)
 */
export class TypedArrayStream {
  private _offset: number;

  constructor(
    readonly typedArray: Uint8ClampedArray | Uint8Array | Uint16Array,
  ) {
    this._offset = 0;
  }

  read() {
    return this.typedArray[this._offset++];
  }

  write(value: number) {
    this.typedArray[this._offset++] = value;
  }

  skip(itemsCount: number) {
    this._offset += itemsCount;
  }

  rewind() {
    this._offset = 0;
  }

  // toUint8Array() {
  //   return new Uint8Array(this._dataView.buffer, this._dataView.byteOffset, this._dataView.byteLength);
  // }

  // toDataView() {
  //   return this._dataView;
  // }

  // get byteLength() {
  //   return this._dataView.byteLength;
  // }

  // get currentOffset() {
  //   return this._currentOffset;
  // }
}
