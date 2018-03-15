import { PNGImage } from './image';

async function run() {
  const configResponse = await fetch('/images/PngSuite/config.json');
  const config: { images: string[] } = await configResponse.json();

  const images = config.images.filter(image => image.match(/...n..../));
  for (const image of images) {
    const imageResponse = await fetch(`/images/PngSuite/${image}`);
    const blob = await imageResponse.blob();
    const arrayBuffer = await blobToArrayBuffer(blob);

    drawImage(image, new Uint8Array(arrayBuffer));
  }

  return fetch('/images/PngSuite/config.json');
}

async function blobToArrayBuffer(blob: Blob) {
  var fileReader = new FileReader();
  return new Promise<ArrayBuffer>((resolve, reject) => {
    fileReader.onload = (event: any) => {
      resolve(event.target.result);
    };
    fileReader.readAsArrayBuffer(blob);
  });
}

function drawImage(name: string, uint8Array: Uint8Array) {
  const container = document.createElement('div');
  container.className = 'image-item';
  container.style.cursor = 'zoom-in'
  container.onclick = () => {
    debugger;
    drawImage(name, uint8Array);
  }
  document.body.appendChild(container);
  
  // HTML
  const text = document.createElement('div');
  text.innerHTML = name;
  container.appendChild(text);

  // PARSING
  let image;
  try {
    image = PNGImage.fromFile(new Uint8Array(uint8Array));
  } catch(e) {
    text.innerHTML += '<br>Parse error: ' + e;
    text.style.color = 'red';
    return;
  }

  console.log('info', image.getInfo());
  const palette = image.getPalette();
  if (palette) {
    console.log('palette colors', palette.getColorsCount());
  }
  console.log('suggested palettes', image.getImageData());

  // Canvas
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);

  // IMG
  const img = document.createElement('img');
  img.src = `/images/PngSuite/${name}`;
  container.appendChild(img);

  // DRAWING
  const width = image.getInfo().width;
  const height = image.getInfo().height;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    const source = image.getImageData()!;

    let uint8ClampedArray;
    if (image.getInfo().bitDepth !== 8) {
      uint8ClampedArray = new Uint8ClampedArray(4 * width * height);
      const bitDepth = image.getInfo().bitDepth;
      const multiplier = bitDepth > 8 ? 2 ** (8 - bitDepth) : (2 ** (9 - bitDepth)) - 1;
      for (let i = 0; i < 4 * width * height; i++) {
        uint8ClampedArray[i] = source[i] * multiplier;
      }
    } else {
      uint8ClampedArray = new Uint8ClampedArray(source.buffer);
    }
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


    const imageData = new ImageData(uint8ClampedArray, width, height);
    ctx.putImageData(imageData, 0, 0);
  }


}

run();