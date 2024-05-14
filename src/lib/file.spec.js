import { describe, expect, test } from 'vitest';
import { getPathInfo } from '$lib/file';

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
