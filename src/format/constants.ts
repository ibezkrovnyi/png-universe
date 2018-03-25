export const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// SPEC
export enum ChunkTypes {
  // Critical Chunks
  IHDR = 0x49484452,
  IDAT = 0x49444154,
  PLTE = 0x504c5445,
  IEND = 0x49454e44,

  // Ancillary chunk
  tRNS = 0x74524e53,
  gAMA = 0x67414d41,
  sPLT = 0x73504C54,
  bKGD = 0x624b4744,
}

export enum ChunkNames {
   IHDR = 'IHDR',
   IEND = 'IEND',
}

export enum Colors {
  Transparent = 0,
}

export namespace Colors {
  export function getOpaque(bitDepth: number) {
    return 2 ** bitDepth - 1;
  }
}

export const mimeType = 'image/png';
