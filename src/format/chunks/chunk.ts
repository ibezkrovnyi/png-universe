import { ChunkTypes, ChunkNames } from '../constants';

export interface Chunk {
  readonly type: ChunkTypes
  readonly data: DataView
  readonly flags: {
    readonly ancillary: boolean
    readonly safeToCopy: boolean
    readonly private: boolean
  }
}

export type DeepReadonly<T> =
    T extends any[] ? DeepReadonlyArray<T[number]> :
    T extends object ? DeepReadonlyObject<T> :
    T;

export interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> {}

export type DeepReadonlyObject<T> = {
  readonly [P in NonFunctionPropertyNames<T>]: DeepReadonly<T[P]>;
} & {
  readonly [P in FunctionPropertyNames<T>]: T[P];
};

export type NonFunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T];
export type FunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? K : never }[keyof T];
