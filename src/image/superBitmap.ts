export interface IFormatPlugin {
  image2format?(sourceProps: ImageProps<IFormatPlugin>): object;
  format2image?(sourceFormatData: object): ImageProps<IFormatPlugin>;
}


export type ImageProps<TFormatPlugin extends IFormatPlugin> = {
  /** non-negative non-zero width in px */
  width: number
  
  /** non-negative non-zero height in px */
  height: number
  
  /** for indexed-colour images, the number of bits per palette index (so, 2^bitDepth colors in palette). For other images, the number of bits per sample in the image */
  bitDepth: BitDepth;
  /** number of bits used to represent a sample value. In an indexed-colour PNG image, samples are stored in the palette and thus the sample depth is always 8 by definition of the palette. In other types of PNG image it is the same as the bit depth. */
  sampleDepth: ImageProps<TFormatPlugin>['bitDepth']
  
  // palette?: Palette;
  bitmap: Uint8Array | Uint16Array;
  formatPlugin: TFormatPlugin;
}

export class Image<T extends IFormatPlugin> {
  constructor(
    private _props: ImageProps<T>,
  ) {

  }
}





const pngPlugin = {
  format2image(sourceFormatData: ): ImageProps<typeof pngPlugin> {
    return {

    }
  }
}

new Image({
  bitDepth: 2,
  sampleDepth: 2,
  width: 100,
  height: 100,
  formatPlugin: {
    image2format(props, )
  }
})