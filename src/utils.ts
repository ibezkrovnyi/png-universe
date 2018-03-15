export function assert<T>(...args: any[]) {
  switch (args.length) {
    case 0: 
      throw new Error('assertion error');
    case 1: 
      if (!args[0]) throw new Error('assertion error');
      break;
    case 2:
      if (args[0] !== args[1]) throw new Error(`assertion error: ${args[0]} is not equal to ${args[1]}`);
      break;
  }
}

export function assertT(value: any, message: string) {
  if (!value) throw new Error(message);
}

export function readText(dataView: DataView, offset: number) {
  const text: string[] = [];
  let ch: number;
  while (ch = dataView.getUint8(offset++)) {
    text.push(String.fromCharCode(ch));
  }
  return text.join('');
}

export function getUint(dataView: DataView, offset: number, bits: number) {
  switch (bits) {
    case 8: return dataView.getUint8(offset);
    case 16: return dataView.getUint16(offset);
    case 32: return dataView.getUint32(offset);
    default: throw new Error(`${bits} is unsupported`);
  }
}