import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { convertDashboardRangeToUtcWindow } from '../../src/features/dashboard/dateRangeConverter.ts';

const previousTz = process.env.TZ;

beforeAll(() => {
  process.env.TZ = 'America/New_York';
});

afterAll(() => {
  process.env.TZ = previousTz;
});

describe('convertDashboardRangeToUtcWindow', () => {
  it('converts 7d to the local calendar window from 6 days ago through end of today', () => {
    const currentDateTime = new Date(2026, 5, 17, 14, 45, 12, 321);
    const window = convertDashboardRangeToUtcWindow('7d', { now: currentDateTime });

    expect(new Date(window.fromUtc).getTime()).toBe(new Date(2026, 5, 11, 0, 0, 0, 0).getTime());
    expect(new Date(window.toUtc).getTime()).toBe(new Date(2026, 5, 17, 23, 59, 59, 999).getTime());
  });

  it('converts 30d to the local calendar window from 29 days ago through end of today', () => {
    const currentDateTime = new Date(2026, 5, 17, 8, 0, 0, 0);
    const window = convertDashboardRangeToUtcWindow('30d', { now: currentDateTime });

    expect(new Date(window.fromUtc).getTime()).toBe(new Date(2026, 4, 19, 0, 0, 0, 0).getTime());
    expect(new Date(window.toUtc).getTime()).toBe(new Date(2026, 5, 17, 23, 59, 59, 999).getTime());
  });

  it('converts 90d to the local calendar window from 89 days ago through end of today', () => {
    const currentDateTime = new Date(2026, 5, 17, 23, 59, 58, 500);
    const window = convertDashboardRangeToUtcWindow('90d', { now: currentDateTime });

    expect(new Date(window.fromUtc).getTime()).toBe(new Date(2026, 2, 20, 0, 0, 0, 0).getTime());
    expect(new Date(window.toUtc).getTime()).toBe(new Date(2026, 5, 17, 23, 59, 59, 999).getTime());
  });

  it('uses local day boundaries rather than subtracting fixed UTC durations', () => {
    const currentDateTime = new Date(2026, 0, 1, 0, 5, 0, 0);

    const window = convertDashboardRangeToUtcWindow('7d', { now: currentDateTime });
    const fromUtc = new Date(window.fromUtc);
    const toUtc = new Date(window.toUtc);

    expect(fromUtc.getFullYear()).toBe(2025);
    expect(fromUtc.getMonth()).toBe(11);
    expect(fromUtc.getDate()).toBe(26);
    expect(fromUtc.getHours()).toBe(0);
    expect(fromUtc.getMinutes()).toBe(0);
    expect(fromUtc.getSeconds()).toBe(0);
    expect(fromUtc.getMilliseconds()).toBe(0);

    expect(toUtc.getFullYear()).toBe(2026);
    expect(toUtc.getMonth()).toBe(0);
    expect(toUtc.getDate()).toBe(1);
    expect(toUtc.getHours()).toBe(23);
    expect(toUtc.getMinutes()).toBe(59);
    expect(toUtc.getSeconds()).toBe(59);
    expect(toUtc.getMilliseconds()).toBe(999);
  });

  it('keeps correct local day boundaries across DST transition dates in a fixed timezone', () => {
    const currentDateTime = new Date(2026, 2, 8, 12, 0, 0, 0);
    const window = convertDashboardRangeToUtcWindow('7d', { now: currentDateTime });

    expect(new Date(window.fromUtc).getTime()).toBe(new Date(2026, 2, 2, 0, 0, 0, 0).getTime());
    expect(new Date(window.toUtc).getTime()).toBe(new Date(2026, 2, 8, 23, 59, 59, 999).getTime());
  });
});