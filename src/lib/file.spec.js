// cspell:disable

import { describe, expect, test } from 'vitest';
import {
  decodeBase64,
  decodeFilePath,
  encodeBase64,
  encodeFilePath,
  getPathInfo,
  isValidFileType,
} from './file.js';

describe('Test encodeFilePath()', () => {
  test('ASCII only', () => {
    expect(encodeFilePath('image.jpg')).toEqual('image.jpg');
    expect(encodeFilePath('path/to/image.jpg')).toEqual('path/to/image.jpg');
  });

  test('encoded', () => {
    expect(encodeFilePath('my image.jpg')).toEqual('my%20image.jpg');
    expect(encodeFilePath('path/to/my image.jpg')).toEqual('path/to/my%20image.jpg');
    expect(encodeFilePath('pa+th/[to]/test?.jpg')).toEqual('pa%2Bth/%5Bto%5D/test%3F.jpg');
    expect(encodeFilePath('フォルダー/画像.jpg')).toEqual(
      '%E3%83%95%E3%82%A9%E3%83%AB%E3%83%80%E3%83%BC/%E7%94%BB%E5%83%8F.jpg',
    );
  });
});

describe('Test decodeFilePath()', () => {
  test('ASCII only', () => {
    expect(decodeFilePath('image.jpg')).toEqual('image.jpg');
    expect(decodeFilePath('path/to/image.jpg')).toEqual('path/to/image.jpg');
  });

  test('encoded', () => {
    expect(decodeFilePath('my%20image.jpg')).toEqual('my image.jpg');
    expect(decodeFilePath('path/to/my%20image.jpg')).toEqual('path/to/my image.jpg');
    expect(decodeFilePath('pa%2Bth/%5Bto%5D/test%3F.jpg')).toEqual('pa+th/[to]/test?.jpg');
    expect(
      decodeFilePath('%E3%83%95%E3%82%A9%E3%83%AB%E3%83%80%E3%83%BC/%E7%94%BB%E5%83%8F.jpg'),
    ).toEqual('フォルダー/画像.jpg');
  });
});

describe('Text isValidFileType()', () => {
  test('image', () => {
    const file = new File([], 'image.png', { type: 'image/png' });

    // Valid cases
    expect(isValidFileType(file, [])).toBe(true);
    expect(isValidFileType(file, ['.png'])).toBe(true);
    expect(isValidFileType(file, ['.png', '.webp'])).toBe(true);
    expect(isValidFileType(file, ['image/*'])).toBe(true);
    expect(isValidFileType(file, ['image/png'])).toBe(true);
    expect(isValidFileType(file, ['image/png', 'image/webp'])).toBe(true);

    // Invalid cases
    expect(isValidFileType(file, ['.jpeg', '.webp'])).toBe(false);
    expect(isValidFileType(file, ['image/jpeg'])).toBe(false);
    expect(isValidFileType(file, ['text/*'])).toBe(false);
  });

  test('Markdown', () => {
    const file = new File([], 'README.md', { type: 'text/markdown' });

    // Valid cases
    expect(isValidFileType(file, [])).toBe(true);
    expect(isValidFileType(file, ['.md'])).toBe(true);
    expect(isValidFileType(file, ['.md', '.yml', '.yaml'])).toBe(true);
    expect(isValidFileType(file, ['text/*'])).toBe(true);
    expect(isValidFileType(file, ['text/markdown'])).toBe(true);

    // Invalid cases
    expect(isValidFileType(file, ['.pdf'])).toBe(false);
    expect(isValidFileType(file, ['image/png'])).toBe(false);
    expect(isValidFileType(file, ['image/*'])).toBe(false);
    expect(isValidFileType(file, ['text/plain', 'application/yaml'])).toBe(false);
  });
});

describe('Test getPathInfo()', () => {
  test('simple', () => {
    expect(getPathInfo('image.jpg')).toEqual({
      dirname: undefined,
      basename: 'image.jpg',
      filename: 'image',
      extension: 'jpg',
    });
    expect(getPathInfo('post.json')).toEqual({
      dirname: undefined,
      basename: 'post.json',
      filename: 'post',
      extension: 'json',
    });
    expect(getPathInfo('archive.tar.gz')).toEqual({
      dirname: undefined,
      basename: 'archive.tar.gz',
      filename: 'archive',
      extension: 'tar.gz',
    });
  });

  test('dot in basename', () => {
    expect(getPathInfo('image.en.jpg')).toEqual({
      dirname: undefined,
      basename: 'image.en.jpg',
      filename: 'image.en',
      extension: 'jpg',
    });
    expect(getPathInfo('post.en.json')).toEqual({
      dirname: undefined,
      basename: 'post.en.json',
      filename: 'post.en',
      extension: 'json',
    });
    expect(getPathInfo('archive.en.tar.gz')).toEqual({
      dirname: undefined,
      basename: 'archive.en.tar.gz',
      filename: 'archive.en',
      extension: 'tar.gz',
    });
  });

  test('no extension', () => {
    expect(getPathInfo('.htaccess')).toEqual({
      dirname: undefined,
      basename: '.htaccess',
      filename: '.htaccess',
      extension: undefined,
    });
  });

  test('with dir', () => {
    expect(getPathInfo('path/to/image.jpg')).toEqual({
      dirname: 'path/to',
      basename: 'image.jpg',
      filename: 'image',
      extension: 'jpg',
    });
    expect(getPathInfo('path/to/post.json')).toEqual({
      dirname: 'path/to',
      basename: 'post.json',
      filename: 'post',
      extension: 'json',
    });
    expect(getPathInfo('path/to/archive.tar.gz')).toEqual({
      dirname: 'path/to',
      basename: 'archive.tar.gz',
      filename: 'archive',
      extension: 'tar.gz',
    });
    expect(getPathInfo('path/to/image.en.jpg')).toEqual({
      dirname: 'path/to',
      basename: 'image.en.jpg',
      filename: 'image.en',
      extension: 'jpg',
    });
    expect(getPathInfo('path/to/post.en.json')).toEqual({
      dirname: 'path/to',
      basename: 'post.en.json',
      filename: 'post.en',
      extension: 'json',
    });
    expect(getPathInfo('path/to/archive.en.tar.gz')).toEqual({
      dirname: 'path/to',
      basename: 'archive.en.tar.gz',
      filename: 'archive.en',
      extension: 'tar.gz',
    });
    expect(getPathInfo('path/to/.htaccess')).toEqual({
      dirname: 'path/to',
      basename: '.htaccess',
      filename: '.htaccess',
      extension: undefined,
    });
  });
});

describe('Test encodeBase64()', () => {
  test('string input', async () => {
    expect(await encodeBase64('Hello, World!')).toEqual('SGVsbG8sIFdvcmxkIQ==');
    expect(await encodeBase64('')).toEqual('');
    expect(await encodeBase64('A')).toEqual('QQ==');
    expect(await encodeBase64('AB')).toEqual('QUI=');
    expect(await encodeBase64('ABC')).toEqual('QUJD');
  });

  test('Unicode string', async () => {
    expect(await encodeBase64('こんにちは')).toEqual('44GT44KT44Gr44Gh44Gv');
    expect(await encodeBase64('🎉🎊')).toEqual('8J+OifCfjoo=');
    expect(await encodeBase64('Café')).toEqual('Q2Fmw6k=');
  });

  test('Blob input', async () => {
    const blob = new Blob(['Hello, World!'], { type: 'text/plain' });

    expect(await encodeBase64(blob)).toEqual('SGVsbG8sIFdvcmxkIQ==');
  });

  test('File input', async () => {
    const file = new File(['Hello, World!'], 'test.txt', { type: 'text/plain' });

    expect(await encodeBase64(file)).toEqual('SGVsbG8sIFdvcmxkIQ==');
  });

  test('Binary content', async () => {
    // Create a blob with binary data
    const uint8Array = new Uint8Array([0, 1, 2, 3, 255, 254, 253]);
    const blob = new Blob([uint8Array]);
    const result = await encodeBase64(blob);

    // This should encode the binary data properly
    expect(result).toEqual('AAECA//+/Q==');
  });
});

describe('Test decodeBase64()', () => {
  test('basic strings', async () => {
    expect(await decodeBase64('SGVsbG8sIFdvcmxkIQ==')).toEqual('Hello, World!');
    expect(await decodeBase64('')).toEqual('');
    expect(await decodeBase64('QQ==')).toEqual('A');
    expect(await decodeBase64('QUI=')).toEqual('AB');
    expect(await decodeBase64('QUJD')).toEqual('ABC');
  });

  test('Unicode strings', async () => {
    expect(await decodeBase64('44GT44KT44Gr44Gh44Gv')).toEqual('こんにちは');
    expect(await decodeBase64('8J+OifCfjoo=')).toEqual('🎉🎊');
    expect(await decodeBase64('Q2Fmw6k=')).toEqual('Café');
  });

  test('special characters', async () => {
    expect(await decodeBase64('IUAjJCVeJiooKQ==')).toEqual('!@#$%^&*()');
    expect(await decodeBase64('PD94bWwgdmVyc2lvbj0iMS4wIj8+')).toEqual('<?xml version="1.0"?>');
  });

  test('multiline content', async () => {
    const multilineText = 'Line 1\nLine 2\nLine 3';
    const encoded = 'TGluZSAxCkxpbmUgMgpMaW5lIDM=';

    expect(await decodeBase64(encoded)).toEqual(multilineText);
  });

  test('JSON content', async () => {
    const jsonString = '{"name":"John","age":30}';
    const encoded = 'eyJuYW1lIjoiSm9obiIsImFnZSI6MzB9';

    expect(await decodeBase64(encoded)).toEqual(jsonString);
  });
});

describe('Test encodeBase64() and decodeBase64() roundtrip', () => {
  test('string roundtrip', async () => {
    const original = 'Hello, 世界! 🌍';
    const encoded = await encodeBase64(original);
    const decoded = await decodeBase64(encoded);

    expect(decoded).toEqual(original);
  });

  test('complex text roundtrip', async () => {
    const original = `
      This is a multiline string
      with various characters: !@#$%^&*()
      Unicode: こんにちは 🎉
      Special chars: "quotes" and 'apostrophes'
      Numbers: 12345
    `;

    const encoded = await encodeBase64(original);
    const decoded = await decodeBase64(encoded);

    expect(decoded).toEqual(original);
  });

  test('empty string roundtrip', async () => {
    const original = '';
    const encoded = await encodeBase64(original);
    const decoded = await decodeBase64(encoded);

    expect(decoded).toEqual(original);
  });

  test('File content roundtrip', async () => {
    const originalContent = 'File content with special chars: àáâãäå';
    const file = new File([originalContent], 'test.txt', { type: 'text/plain' });
    const encoded = await encodeBase64(file);
    const decoded = await decodeBase64(encoded);

    expect(decoded).toEqual(originalContent);
  });
});
