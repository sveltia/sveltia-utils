import { describe, expect, test } from 'vitest';
import { decodeFilePath, encodeFilePath, getPathInfo } from './file';

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
