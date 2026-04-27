import { Transform } from 'stream';

export class NdjsonTransform extends Transform {
  constructor() {
    super({ writableObjectMode: true });
  }

  _transform(chunk, _encoding, callback) {
    callback(null, JSON.stringify(chunk) + '\n');
  }
}
