import { PNGImage } from './image';

async function run() {

  // return fetch('/images/indexed.png');
  // return fetch('/images/baby.png');
  // return fetch('/images/baby-greyscale-1bit.png');
  // return fetch('/images/baby-greyscale-4bits.png');
  return fetch('/images/baby-color-65536.png');
}

run().then(response => response.blob()).then(blob => {

  var fileReader = new FileReader();
  fileReader.onload = function () {
    const image = PNGImage.fromFile(new Uint8Array(this.result));

    console.log('info', image.getInfo());
    const palette = image.getPalette();
    if (palette) {
      console.log('palette colors', palette.getColorsCount());
    }
    console.log('suggested palettes', image.getImageData());


    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    const width = image.getInfo().width;
    const height = image.getInfo().height; 
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if( ctx) {
      const source = image.getImageData()!;
      // const w = (width >> 2 << 2) + 4;
      // const h = (height >> 2 << 2) + 4;
      // const array = new Uint8ClampedArray(w * h * 4);
      // for(let y = 0; y < height; y++) {
      //   for(let x = 0; x < width; x++) {
      //     const a = (w * y + x) * 4;
      //     const s = (width * y + x) * 4;
      //     array[a] = source[s + 0];
      //     array[a+1] = source[s+1];
      //     array[a+2] = source[s+2];
      //     array[a+3] = source[s+3];
      //   }
      // }
      // const imageData = new ImageData(array, w, h);
      const imageData = new ImageData(new Uint8ClampedArray(source.buffer), width, height);
      ctx.putImageData(imageData, 0, 0);
    }
  };
  fileReader.readAsArrayBuffer(blob);


})