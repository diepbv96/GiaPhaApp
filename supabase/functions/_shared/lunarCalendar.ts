// Deno-runtime copy of src/lib/lunarCalendar.ts's conversion algorithm.
//
// Duplicated (not imported across the supabase/ boundary) because Supabase Edge
// Function deploys bundle each function from within `supabase/functions/`, so a
// relative import reaching back into `src/` is not a supported deployment shape;
// `supabase/functions/_shared/` is Supabase's documented convention for code shared
// between Edge Functions. If the algorithm ever changes, update both copies — see
// specs/002-lunar-events-tree-slugs/contracts/lunar-date-conversion.md for the shared
// contract both must satisfy, and src/lib/lunarCalendar.ts for the (identical) browser
// implementation and its reference-date verification.

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  isLeapMonth: boolean;
}

const VIETNAM_TIME_ZONE = 7.0;
const MIN_SUPPORTED_YEAR = 1800;
const MAX_SUPPORTED_YEAR = 2199;

function jdFromDate(day: number, month: number, year: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  let jd =
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;
  if (jd < 2299161) {
    jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }
  return jd;
}

function newMoon(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = Math.PI / 180;

  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);

  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;

  let c1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  c1 -= 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
  c1 -= 0.0004 * Math.sin(dr * 3 * Mpr);
  c1 += 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  c1 -= 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
  c1 -= 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
  c1 += 0.001 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));

  const deltaT =
    T < -11
      ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
      : -0.000278 + 0.000265 * T + 0.000262 * T2;

  return jd1 + c1 - deltaT;
}

function sunLongitude(jdn: number): number {
  const T = (jdn - 2451545.0) / 36525;
  const T2 = T * T;
  const dr = Math.PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let dl = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  dl += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
  let l = (L0 + dl) * dr;
  l -= Math.PI * 2 * Math.floor(l / (Math.PI * 2));
  return l;
}

function sunSegmentIndex(dayNumber: number): number {
  return Math.floor((sunLongitude(dayNumber - 0.5 - VIETNAM_TIME_ZONE / 24) / Math.PI) * 6);
}

function newMoonDay(k: number): number {
  return Math.floor(newMoon(k) + 0.5 + VIETNAM_TIME_ZONE / 24);
}

function lunarMonth11StartDay(year: number): number {
  const daysSinceEpoch = jdFromDate(31, 12, year) - 2415021;
  const k = Math.floor(daysSinceEpoch / 29.530588853);
  let nm = newMoonDay(k);
  if (sunSegmentIndex(nm) >= 9) {
    nm = newMoonDay(k - 1);
  }
  return nm;
}

function leapMonthOffset(a11: number): number {
  const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = sunSegmentIndex(newMoonDay(k + 1));
  let i = 1;
  let arc = last;
  do {
    last = arc;
    i += 1;
    arc = sunSegmentIndex(newMoonDay(k + i));
  } while (arc !== last && i < 14);
  return i - 1;
}

function isValidGregorianDate(day: number, month: number, year: number): boolean {
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;
  const daysInMonth = new Date(year, month, 0).getDate();
  return day <= daysInMonth;
}

export function toLunarDate(gregorian: { day: number; month: number; year: number }): LunarDate | null {
  const { day, month, year } = gregorian;
  if (year < MIN_SUPPORTED_YEAR || year > MAX_SUPPORTED_YEAR) return null;
  if (!isValidGregorianDate(day, month, year)) return null;

  const dayNumber = jdFromDate(day, month, year);
  const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = newMoonDay(k + 1);
  if (monthStart > dayNumber) {
    monthStart = newMoonDay(k);
  }

  let a11 = lunarMonth11StartDay(year);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= monthStart) {
    lunarYear = year;
    a11 = lunarMonth11StartDay(year - 1);
  } else {
    lunarYear = year + 1;
    b11 = lunarMonth11StartDay(year + 1);
  }

  const lunarDay = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let isLeapMonth = false;
  let lunarMonth = diff + 11;

  if (b11 - a11 > 365) {
    const offset = leapMonthOffset(a11);
    if (diff >= offset) {
      lunarMonth = diff + 10;
      if (diff === offset) isLeapMonth = true;
    }
  }

  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;

  return { day: lunarDay, month: lunarMonth, year: lunarYear, isLeapMonth };
}
