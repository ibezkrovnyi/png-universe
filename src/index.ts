import * as fs from 'fs';
import * as path from 'path';
import { PNGImage } from './image';

const data = fs.readFileSync(path.join(__dirname, 'test.png')).buffer;
const image = PNGImage.fromFile(new Uint8Array(data));

console.log('info', image.getInfo());
console.log('palette colors', image.getPalette()!.getColorsCount());
console.log('suggested palettes', image.getImageData());