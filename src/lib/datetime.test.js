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

  test('midnight is hour 00, not 24', () => {
    const date = new Date('2023-03-12T00:00:00Z');
    const result = getDateTimeParts({ date, timeZone: 'UTC' });

    expect(result.hour).toEqual('00');
  });
});
