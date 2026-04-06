import crypto from 'crypto';
import { createItemModel } from '#models';

const sortObject = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(sortObject);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortObject(obj[key]);
        return acc;
      }, {});
  }
  return obj;
};

export const getModelHash = () => {
  const model = createItemModel({});
  const sortedModel = sortObject(model);

  return crypto
    .createHash('md5')
    .update(JSON.stringify(sortedModel))
    .digest('hex');
};
