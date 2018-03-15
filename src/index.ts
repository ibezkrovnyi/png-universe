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
  } catch (e) {
    text.innerHTML += '<br>Parse error: ' + e;
    text.style.color = 'red';
    return;
  }
  const width = image.getInfo().width;
  const height = image.getInfo().height;

  console.log('info', image.getInfo());
  const palette = image.getPalette();
  if (palette) {
    console.log('palette colors', palette.getColorsCount());
  }
  console.log('suggested palettes', image.getImageData());

  // Canvas
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);

  // CANVAS-ORIGINAL
  const canvasOriginal = document.createElement('canvas');
  container.appendChild(canvasOriginal);

  // IMG
  const img = document.createElement('img');
  img.onload = () => {
    canvasOriginal.width = width;
    canvasOriginal.height = height;
    const ctx = canvasOriginal.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0);
    }
  }
  img.src = `/images/PngSuite/${name}`;
  container.appendChild(img);

  // DRAWING
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    const source = image.getImageData()!;

    let uint8ClampedArray;
    if (image.getInfo().sampleDepth !== 8) {
      uint8ClampedArray = new Uint8ClampedArray(4 * width * height);
      const multiplierTable = {
        "1": 255,
        "2": 85,
        "4": 17,
        "8": 1,
        "16": 0.0038910505836575876,
      }
      const bitDepth = image.getInfo().sampleDepth;
      const multiplier = multiplierTable[bitDepth];
      for (let i = 0; i < 4 * width * height; i++) {
        uint8ClampedArray[i] = source[i] * multiplier;
      }
    } else {
      uint8ClampedArray = new Uint8ClampedArray(source.buffer);
    }

    // fill with white color (by default, need to use special color if implemented)
    ctx.fillStyle = "rgba(255,255,255,255)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // draw image
    const imageData = new ImageData(uint8ClampedArray, width, height);
    ctx.putImageData(imageData, 0, 0);
  }


}

run();