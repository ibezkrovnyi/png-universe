import { Chunk } from '../format/chunks/chunk';
import { ChunkTypes } from '../format/constants';

export function getFirstChunkByType(chunks: Chunk[], type: ChunkTypes) {
  const chunksByType = getChunksByType(chunks, type);
  return chunksByType.length > 0 ? chunksByType[0] : undefined;
}

export function getChunksByType(chunks: Chunk[], type: ChunkTypes) {
  return chunks.filter(chunk => chunk.type === type);
}
