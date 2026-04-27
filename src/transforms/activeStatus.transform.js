import { Transform } from 'stream';

export class ActiveStatusTransform extends Transform {
  constructor() {
    super({ objectMode: true });
  }

  _transform(device, _encoding, callback) {
    const transformed = {
      ...device,
      isActive: device.status === 'on',
    };
    callback(null, transformed);
  }
}
