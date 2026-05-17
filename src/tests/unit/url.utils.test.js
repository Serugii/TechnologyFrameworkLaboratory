import { describe, it, expect } from 'vitest';
import { buildImageUrl } from '../../utils/url.utils.js';

describe('buildImageUrl', () => {
  it('повертає повний URL, якщо imagePath задано', () => {
    const result = buildImageUrl('http://localhost:3000', '/1/image.jpg');
    expect(result).toBe('http://localhost:3000/uploads/1/image.jpg');
  });

  it('повертає null, якщо imagePath — порожній рядок', () => {
    expect(buildImageUrl('http://localhost:3000', '')).toBeNull();
  });

  it('повертає null, якщо imagePath — null', () => {
    expect(buildImageUrl('http://localhost:3000', null)).toBeNull();
  });

  it('повертає null, якщо imagePath — undefined', () => {
    expect(buildImageUrl('http://localhost:3000', undefined)).toBeNull();
  });

  it('коректно обробляє baseUrl без trailing slash', () => {
    const result = buildImageUrl('https://example.com', '/2/photo.png');
    expect(result).toBe('https://example.com/uploads/2/photo.png');
  });

  it('зберігає структуру шляху до файлу', () => {
    const result = buildImageUrl('http://api.test', '/123/image.jpg');
    expect(result).toContain('/uploads/');
    expect(result).toContain('/123/image.jpg');
  });
});
