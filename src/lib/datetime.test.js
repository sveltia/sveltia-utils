import { describe, expect, test } from 'vitest';
import { getDateTimeParts } from './datetime.js';

describe('Test getDateTimeParts()', () => {
  test('default (current date, local time zone)', () => {
    const result = getDateTimeParts();

    expect(result).toHaveProperty('year');
    expect(result).toHaveProperty('month');
    expect(result).toHaveProperty('day');
    expect(result).toHaveProperty('hour');
    expect(result).toHaveProperty('minute');
    expect(result).toHaveProperty('second');
    expect(result).toHaveProperty('timeZoneName');
    expect(result.year).toMatch(/^\d{4}$/);
    expect(result.month).toMatch(/^\d{2}$/);
    expect(result.day).toMatch(/^\d{2}$/);
    expect(result.minute).toMatch(/^\d{2}$/);
    expect(result.second).toMatch(/^\d{2}$/);
  });

  test('UTC time zone', () => {
    const date = new Date('2023-01-23T12:34:56Z');
    const result = getDateTimeParts({ date, timeZone: 'UTC' });

    expect(result.year).toEqual('2023');
    expect(result.month).toEqual('01');
    expect(result.day).toEqual('23');
    expect(result.hour).toEqual('12');
    expect(result.minute).toEqual('34');
    expect(result.second).toEqual('56');
    expect(result.timeZoneName).toEqual('GMT+00:00');
  });

  test('non-UTC time zone', () => {
    const date = new Date('2023-06-15T00:00:00Z');
    const result = getDateTimeParts({ date, timeZone: 'America/New_York' });

    expect(result.year).toEqual('2023');
    expect(result.month).toEqual('06');
    expect(result.day).toEqual('14');
    expect(result.hour).toEqual('20');
    expect(result.minute).toEqual('00');
    expect(result.second).toEqual('00');
  });

  test('midnight UTC normalizes hour 24 to 00', () => {
    // Some implementations may return '24' for midnight; ensure it's normalized to '00'
    const date = new Date('2023-03-12T00:00:00Z');
    const result = getDateTimeParts({ date, timeZone: 'UTC' });

    expect(result.hour).toEqual('00');
  });

  test('normalizes hour 24 to 00 (edge case in some implementations)', () => {
    const original = Intl.DateTimeFormat.prototype.formatToParts;

    Intl.DateTimeFormat.prototype.formatToParts = /** @type {any} */ (
      () => [
        { type: 'year', value: '2023' },
        { type: 'month', value: '01' },
        { type: 'day', value: '01' },
        { type: 'hour', value: '24' },
        { type: 'minute', value: '00' },
        { type: 'second', value: '00' },
        { type: 'timeZoneName', value: 'GMT+00:00' },
      ]
    );

    const result = getDateTimeParts({ timeZone: 'UTC' });

    expect(result.hour).toEqual('00');
    Intl.DateTimeFormat.prototype.formatToParts = original;
  });
});
