W3C Specification - 10 November 2003: https://www.w3.org/TR/2003/REC-PNG-20031110/ (check if there is new version available https://www.w3.org/TR/PNG/)
International Standard: ISO/IEC 15948:2003

Status of PNG: http://www.libpng.org/pub/png/pngstatus.html


pngjs, png-js: Filter(Reverse) is incorrectly implemented (should be by bytes, implemented by pixels, scanline should always start from new byte (for 1,2,4 bit depth modes), colorTypes * bitDepth is very limited, implementation is hard to understand)