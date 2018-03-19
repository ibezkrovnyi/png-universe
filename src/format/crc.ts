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

export function crc32(data: DataView, offset: number, length: number) {
  const uint8Array = new Uint8Array(data.buffer, data.byteOffset + offset, length);
  let crc = -1;
  for (let i = 0; i < length; i++) {
    const value = uint8Array[i];
    crc = crcTable[(crc ^ value) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}
