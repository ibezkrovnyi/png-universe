https://www.w3.org/TR/2003/REC-PNG-20031110/#11Chunks

pngjs, png-js: Filter(Reverse) is incorrectly implemented (should be by bytes, implemented by pixels, scanline should always start from new byte (for 1,2,4 bit depth modes), colorTypes * bitDepth is very limited, implementation is hard to understand)