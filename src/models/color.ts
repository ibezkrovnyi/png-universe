export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export class Color1D {
  constructor(public grey: number) {
  }
}

export class Color2D {
  constructor(
    public grey: number,
    public a: number,
  ) {}
}

export class Color3D {
  constructor(
    public r: number,
    public g: number,
    public b: number,
  ) {}
}

export class Color4D {
  constructor(
    public r: number,
    public g: number,
    public b: number,
    public a: number,
  ) {}
}