const crcTable: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c;
}

export class CRC32 {
  private crc = -1;

  static crc32(buf: number[]) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return crc ^ -1;
  };

  write(data: DataView, offset: number, length: number) {
    for (let i = 0; i < length; i++) {
      const value = data.getUint8(offset + i);
      this.crc = crcTable[(this.crc ^ value) & 0xff] ^ (this.crc >>> 8);
    }
    return true;
  }
  getCRC() {
    return this.crc ^ -1;
  }
};

export function crc32(data: DataView, offset: number, length: number) {
  let crc = -1;
  for (let i = 0; i < length; i++) {
    const value = data.getUint8(offset + i);
    crc = crcTable[(crc ^ value) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
};






