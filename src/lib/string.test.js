import { describe, expect, test } from 'vitest';
import { compare, escapeRegExp, isURL, stripSlashes, stripTags, truncate } from './string.js';

describe('Test escapeRegExp()', () => {
  test('no special characters', () => {
    expect(escapeRegExp('hello')).toEqual('hello');
    expect(escapeRegExp('abc123')).toEqual('abc123');
  });

  test('special regex characters', () => {
    expect(escapeRegExp('.')).toEqual('\\.');
    expect(escapeRegExp('*')).toEqual('\\*');
    expect(escapeRegExp('+')).toEqual('\\+');
    expect(escapeRegExp('?')).toEqual('\\?');
    expect(escapeRegExp('^')).toEqual('\\^');
    expect(escapeRegExp('$')).toEqual('\\$');
    expect(escapeRegExp('{')).toEqual('\\{');
    expect(escapeRegExp('}')).toEqual('\\}');
    expect(escapeRegExp('(')).toEqual('\\(');
    expect(escapeRegExp(')')).toEqual('\\)');
    expect(escapeRegExp('|')).toEqual('\\|');
    expect(escapeRegExp('[')).toEqual('\\[');
    expect(escapeRegExp(']')).toEqual('\\]');
    expect(escapeRegExp('\\')).toEqual('\\\\');
  });

  test('mixed string', () => {
    expect(escapeRegExp('foo.bar*baz')).toEqual('foo\\.bar\\*baz');
    expect(escapeRegExp('https://example.com')).toEqual('https://example\\.com');
    expect(escapeRegExp('(test)')).toEqual('\\(test\\)');
  });

  test('escaped string works in RegExp', () => {
    const escaped = escapeRegExp('hello.world');
    const regex = new RegExp(escaped);

    expect(regex.test('hello.world')).toBe(true);
    expect(regex.test('helloxworld')).toBe(false);
  });
});

describe('Test truncate()', () => {
  test('string shorter than max', () => {
    expect(truncate('Hello', 10)).toEqual('Hello');
    expect(truncate('Hi', 5)).toEqual('Hi');
  });

  test('string equal to max', () => {
    expect(truncate('Hello', 5)).toEqual('Hello');
  });

  test('string longer than max', () => {
    expect(truncate('Hello, World!', 5)).toEqual('Hello…');
    expect(truncate('Hello, World!', 7)).toEqual('Hello,…');
  });

  test('custom ellipsis', () => {
    expect(truncate('Hello, World!', 5, { ellipsis: '...' })).toEqual('Hello...');
    expect(truncate('Hello, World!', 5, { ellipsis: '' })).toEqual('Hello');
  });

  test('emoji and Unicode (counts by code points)', () => {
    expect(truncate('🎉🎊🎈', 2)).toEqual('🎉🎊…');
    expect(truncate('こんにちは', 3)).toEqual('こんに…');
  });

  test('empty string', () => {
    expect(truncate('', 5)).toEqual('');
  });
});

describe('Test stripSlashes()', () => {
  test('no slashes', () => {
    expect(stripSlashes('foo/bar')).toEqual('foo/bar');
    expect(stripSlashes('hello')).toEqual('hello');
  });

  test('leading slashes', () => {
    expect(stripSlashes('/foo/bar')).toEqual('foo/bar');
    expect(stripSlashes('///foo/bar')).toEqual('foo/bar');
  });

  test('trailing slashes', () => {
    expect(stripSlashes('foo/bar/')).toEqual('foo/bar');
    expect(stripSlashes('foo/bar///')).toEqual('foo/bar');
  });

  test('both leading and trailing slashes', () => {
    expect(stripSlashes('/foo/bar/')).toEqual('foo/bar');
    expect(stripSlashes('///foo/bar///')).toEqual('foo/bar');
  });

  test('empty string', () => {
    expect(stripSlashes('')).toEqual('');
    expect(stripSlashes('/')).toEqual('');
    expect(stripSlashes('///')).toEqual('');
  });
});

describe('Test stripTags()', () => {
  test('no tags', () => {
    expect(stripTags('Hello, World!')).toEqual('Hello, World!');
    expect(stripTags('plain text')).toEqual('plain text');
  });

  test('simple tags', () => {
    expect(stripTags('<div>Hello</div>')).toEqual('Hello');
    expect(stripTags('<p>Paragraph</p>')).toEqual('Paragraph');
    expect(stripTags('<b>Bold</b>')).toEqual('Bold');
  });

  test('nested tags', () => {
    expect(stripTags('<div><p>Nested</p></div>')).toEqual('Nested');
    expect(stripTags('<ul><li>item 1</li><li>item 2</li></ul>')).toEqual('item 1item 2');
  });

  test('empty string', () => {
    expect(stripTags('')).toEqual('');
  });

  test('tags only', () => {
    expect(stripTags('<br/>')).toEqual('');
    expect(stripTags('<hr>')).toEqual('');
  });
});

describe('Test isURL()', () => {
  test('valid URLs', () => {
    expect(isURL('https://example.com')).toBe(true);
    expect(isURL('http://example.com')).toBe(true);
    expect(isURL('https://example.com/path?query=1#hash')).toBe(true);
    expect(isURL('ftp://files.example.com')).toBe(true);
  });

  test('invalid URLs', () => {
    expect(isURL('not a url')).toBe(false);
    expect(isURL('example.com')).toBe(false);
    expect(isURL('')).toBe(false);
    expect(isURL('just text')).toBe(false);
  });

  test('fallback without URL.canParse', () => {
    const original = URL.canParse;

    // @ts-ignore
    URL.canParse = undefined;
    expect(isURL('https://example.com')).toBe(true);
    expect(isURL('not a url')).toBe(false);
    URL.canParse = original;
  });
});

describe('Test compare()', () => {
  test('simple', () => {
    expect(['Lorem', 'ipsum'].sort(compare)).toEqual(['ipsum', 'Lorem']);
    expect(
      ['sample-1.jpg', 'sample-10.jpg', 'sample-99.jpg', 'sample-2.jpg'].sort(compare),
    ).toEqual(['sample-1.jpg', 'sample-2.jpg', 'sample-10.jpg', 'sample-99.jpg']);
  });
});
