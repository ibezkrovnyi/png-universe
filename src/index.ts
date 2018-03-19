import { PNGImage } from './lib';
// @ts-ignore
import { PNG } from 'pngjs3/browser';

async function run(folder: string) {
  const configResponse = await fetch(`/images/${folder}/config.json`);
  const config: { images: string[] } = await configResponse.json();

  const images = config.images; // .filter(image => image.match(/...n..../));
  for (const image of images) {
    const url = `/images/${folder}/${image}`;
    const imageResponse = await fetch(url);
    const blob = await imageResponse.blob();
    const arrayBuffer = await blobToArrayBuffer(blob);

    for(var p = 0; p < 10; p++) {
      drawImage(image, url, new Uint8Array(arrayBuffer));
    }
  }
}

async function blobToArrayBuffer(blob: Blob) {
  const fileReader = new FileReader();
  return new Promise<ArrayBuffer>((resolve, reject) => {
    fileReader.onload = function () {
      resolve(this.result);
    };
    fileReader.readAsArrayBuffer(blob);
  });
}

function drawImage(name: string, url: string, uint8Array: Uint8Array) {
  if (name !== 'children-602977_1920.png') return;
  console.profile('func ' + name);
  const container = document.createElement('div');
  container.className = 'image-item';
  container.onclick = () => {
    debugger;
    drawImage(name, url, uint8Array);
  };
  document.body.appendChild(container);

  // HTML
  const text = document.createElement('div');
  text.innerHTML = name;
  container.appendChild(text);

  let libTime = 0;
  let pngjsTime = 0;
  let tmpTime;

  // PARSING
  const data = new Uint8Array(uint8Array);
  let image;
  tmpTime = performance.now();
  try {
    image = parseLib(name, data);
  } catch (e) {
    text.innerHTML += '<br>Parse error: ' + e;
    text.style.color = 'red';
  }
  console.log('fromFile', performance.now() - tmpTime);
  libTime += (performance.now() - tmpTime);

  if (!image) {
    return;
  }

  const width = image.getInfo().width;
  const height = image.getInfo().height;

  console.log('info', image.getInfo());
  const palette = image.getPalette();
  if (palette) {
    console.log('palette colors', palette.getColorsCount());
  }
  console.log('suggested palettes', image.getSuggestedPalettes());

  // Canvas
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);

  // CANVAS-PNGJS
  const canvasOriginal = document.createElement('canvas');
  container.appendChild(canvasOriginal);

  // IMG
  const img = document.createElement('img');
  img.onload = () => {
    canvasOriginal.width = width;
    canvasOriginal.height = height;
    const ctx = canvasOriginal.getContext('2d');
    if (ctx) {
      const toBuffer = (ab: Uint8Array) => {
        const buf = new Buffer(ab.byteLength);
        const view = new Uint8Array(ab);
        for (let i = 0; i < buf.length; ++i) {
          buf[i] = view[i];
        }
        return buf;
      };
      const data = new Uint8Array(uint8Array);
      tmpTime = performance.now();
      console.profile(name + ' - pngjs');
      const png = PNG.sync.read(toBuffer(data));

      const adjustGamma = function adjustGamma(src: any) {
        if (src.gamma) {
          const data = src.data;

          if (!data) {
            throw new Error('No data available for object');
          }

          for (let y = 0; y < src.height; y++) {
            for (let x = 0; x < src.width; x++) {
              const idx = src.width * y + x << 2;

              for (let i = 0; i < 3; i++) {
                let sample = data[idx + i] / 255;
                sample = Math.pow(sample, 1 / 2.2 / src.gamma);
                data[idx + i] = Math.round(sample * 255);
              }
            }
          }
          src.data = data;
          src.gamma = 0;
        }
      };

      adjustGamma(png);
      console.profileEnd();
      pngjsTime += (performance.now() - tmpTime);
      const uint8ClampedArray2 = new Uint8ClampedArray(png.data);
      const imageData = new ImageData(uint8ClampedArray2, width, height);
      ctx.putImageData(imageData, 0, 0);

      // ctx.imageSmoothingEnabled = false;
      // ctx.drawImage(img, 0, 0);
    }
  };
  img.src = url;
  container.appendChild(img);

  // DRAWING
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (ctx) {

    //console.profile(name + '->toCustomImageData');
    const source = image.toCustomImageData({
      channelsMap: 'RGBA',
      sampleDepth: 8,
    });
    //console.profileEnd();
    libTime += (performance.now() - tmpTime);

    // let uint8ClampedArray;
    // if (image.getInfo().sampleDepth !== 8) {
    //   uint8ClampedArray = new Uint8ClampedArray(4 * width * height);
    //   const multiplierTable = {
    //     1: 255,
    //     2: 85,
    //     4: 17,
    //     8: 1,
    //     16: 0.0038910505836575876,
    //   };
    //   const bitDepth = image.getInfo().sampleDepth;
    //   const multiplier = multiplierTable[bitDepth];
    //   for (let i = 0; i < 4 * width * height; i++) {
    //     uint8ClampedArray[i] = source[i] * multiplier;
    //   }
    // } else {
    //   uint8ClampedArray = new Uint8ClampedArray(source.buffer);
    // }

    // fill with white color (by default, need to use special color if implemented)
    ctx.fillStyle = 'rgba(255,255,255,255)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // draw image
    /*Array.from(source).map(c => c * 255 / (2 ** 8 - 1))*/
    const imageData = new ImageData(
      new Uint8ClampedArray(source),
      width,
      height,
    );
    ctx.putImageData(imageData, 0, 0);
  }
  console.profileEnd();
  console.log(`${name}: libTime=${libTime}, pngjsTime=${pngjsTime}`);
}

run('PngSuite')
  .then(() => run('Other'));

function parseLib(name: string, data: Uint8Array) {
  //console.profile(name);
  const image = PNGImage.fromFile(data);
  //console.profileEnd();
  return image;
}