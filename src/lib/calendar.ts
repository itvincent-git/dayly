import type { Locale } from '../i18n';

export type HolidayMap = Map<string, string>;

export type CalendarDay = {
  date: Date;
  isoKey: string;
  dayNumber: number;
  weekdayIndex: number;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  isToday: boolean;
  holidayName?: string;
};

type HolidayRecord = {
  date: string;
  name: string;
  type?: string;
};

const holidayCache = new Map<string, HolidayMap>();
let holidaysModulePromise: Promise<typeof import('date-holidays')> | undefined;

function getMonthStart(month: Date) {
  return new Date(month.getFullYear(), month.getMonth(), 1);
}

function getTodayKey() {
  return toIsoKey(new Date());
}

export function toIsoKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addMonths(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

export function getMonthLabel(date: Date, locale: Locale, months: readonly string[]) {
  if (locale === 'zh') {
    return `${date.getFullYear()}年${months[date.getMonth()]}`;
  }

  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function buildCalendarDays(month: Date, holidays: HolidayMap) {
  const monthStart = getMonthStart(month);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  const days: CalendarDay[] = [];
  const todayKey = getTodayKey();

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const isoKey = toIsoKey(date);

    days.push({
      date,
      isoKey,
      dayNumber: date.getDate(),
      weekdayIndex: date.getDay(),
      isCurrentMonth: date.getMonth() === month.getMonth(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isToday: isoKey === todayKey,
      holidayName: holidays.get(isoKey)
    });
  }

  return days;
}

async function loadHolidaysModule() {
  holidaysModulePromise ??= import('date-holidays');
  return holidaysModulePromise;
}

export async function getHolidaysForYear(year: number, locale: Locale): Promise<HolidayMap> {
  const cacheKey = `${year}:${locale}`;
  const cached = holidayCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const { default: Holidays } = await loadHolidaysModule();
  const hd = new Holidays('CN');
  const language = locale === 'zh' ? 'zh' : 'en';

  if (typeof hd.setLanguages === 'function') {
    hd.setLanguages(language);
  }

  const records = (hd.getHolidays(year, language) as HolidayRecord[] | undefined) ?? [];
  const holidays = new Map<string, string>();

  for (const record of records) {
    if (record.type !== 'public') {
      continue;
    }

    const key = record.date.slice(0, 10);
    holidays.set(key, record.name);
  }

  holidayCache.set(cacheKey, holidays);
  return holidays;
}
