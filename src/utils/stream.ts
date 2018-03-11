export class DataViewStream {
  private _currentOffset: number;
  private _dataView: DataView;
  
  constructor(dataView: DataView, byteOffset?: number, byteLength?: number) {
    this._dataView = new DataView(dataView.buffer, dataView.byteOffset + byteOffset, byteLength);
    this._currentOffset = 0;
  }

  getDataView(byteLength: number) {
    const dataView = new DataView(this._dataView.buffer, this._dataView.byteOffset + this._currentOffset, length);
    this._currentOffset += length;
    return dataView;
  }

  getUint8() {
    return this._dataView.getUint8(this._currentOffset++);
  }

  getUint16() {
    const uint16 = this._dataView.getUint16(this._currentOffset);
    this._currentOffset += 2;
    return uint16;
  }

  getUint32() {
    const uint32 = this._dataView.getUint32(this._currentOffset);
    this._currentOffset += 4;
    return uint32;
  }
}