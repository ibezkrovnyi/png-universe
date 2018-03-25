import * as fs from 'fs-extra';
import * as path from 'path';
import { PNGImage } from '../../src/lib';
import '../utils';

// await page.screenshot({
//   path,
//   omitBackground: true,
//   clip: {
//     x, y, width, height,
//   }
// });

import * as puppeteer from 'puppeteer';

const testPath = __dirname;
const imagesPath = path.join(testPath, '../../images');
const maxWidth = 1920;
const maxHeight = 1080;
const canvasWidth = maxWidth + 50;
const canvasHeight = maxHeight * 2 + 50;

let browser;
let page;
beforeAll(async () => {
  browser = await puppeteer.launch({ headless: true });
  page = await browser.newPage();
  await page.setViewport({ width: canvasWidth, height: canvasHeight });
  await page.evaluate((width, height) => {
    document.body.style.width = width + 'px';
    document.body.style.height = height + 'px';
  }, canvasWidth, canvasHeight);
}, 10000);

afterAll(async () => {
 await browser.close();
}, 10000);

beforeEach(async () => {
  await page.evaluate(() => document.body.innerHTML = '');
})

testSuite('PngSuite');
testSuite('Other');

function testSuite(suiteFolder) {
  const suitePath = path.join(imagesPath, suiteFolder);
  const json = JSON.parse(fs.readFileSync(path.join(suitePath, 'config.json'), 'utf8'));
  const images = suiteFolder === 'PngSuite' ? json.images.filter(image => image.match(/^[^x]..[^i]..../)) : json.images;
  for (let image of images) {
    test(`read ${suiteFolder}/${image}`, async () => {
      await testDecodeImage({
        filePath: suitePath,
        fileName: image,
      })
    }, 50000);
  }
}

async function testDecodeImage({ filePath, fileName }) {
  const filePathName = path.join(filePath, fileName);
  const snapshotId = fileName.replace(/\.[^/.]+$/, '');
  const snapshotPath = path.join(testPath, '__image_snapshots__');
  const data = fs.readFileSync(filePathName);
  const image = PNGImage.fromFile(new Uint8Array([...data]));

  const { width, height } = image;

  const imageData = image.toCustomImageData({
    channelsMap: 'RGBA',
    sampleDepth: 8,
    applyGamma: true
  });

  const rectLib = await page.evaluate((width, height, imageDataInString) => {
    const container = document.body;
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const imageData = new ImageData(
        new Uint8ClampedArray(imageDataInString),
        width,
        height,
      );
      ctx.putImageData(imageData, 0, 0);
    }

    return {
      x: canvas.offsetLeft,
      y: canvas.offsetTop,
      width: canvas.offsetWidth,
      height: canvas.offsetHeight,
    };
  }, width, height, Array.from(imageData));

  const rectReference = await page.evaluate((path) => new Promise((resolve, reject) => {
    const container = document.body;
    const img = document.createElement('img');
    img.onload = () => {
      resolve({
        x: img.offsetLeft,
        y: img.offsetTop,
        width: img.offsetWidth,
        height: img.offsetHeight,
      });
    }
    img.src = path;
    container.appendChild(img);
  }), 'data:image/png;base64,' + data.toString('base64'));

  // await new Promise(() => {});

  const screenshotLib = await page.screenshot({ clip: rectLib, omitBackground: true, type: 'png' });
  const screenshotReference = await page.screenshot({ clip: rectReference, omitBackground: true, type: 'png' });
  fs.writeFileSync(path.join(snapshotPath, snapshotId + '-snap.png'), screenshotReference);

  expect(screenshotLib).toMatchImageSnapshot({
    customSnapshotIdentifier: snapshotId,
    customSnapshotsDir: snapshotPath,
  });
}