import type { Locale } from '../i18n';

export type CalendarNoteType = 'public_holiday' | 'transfer_workday';

export type CalendarNote = {
  name: string;
  type: CalendarNoteType;
};

export type HolidayMap = Map<string, CalendarNote>;

export type CalendarDay = {
  date: Date;
  isoKey: string;
  dayNumber: number;
  weekdayIndex: number;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  isToday: boolean;
  note?: CalendarNote;
};

type HolidayRecord = {
  date: string;
  name: string;
  name_cn?: string;
  name_en?: string;
  type?: string;
};

const holidayCache = new Map<string, HolidayMap>();
const holidayRecordCache = new Map<number, HolidayRecord[]>();

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
      note: holidays.get(isoKey)
    });
  }

  return days;
}

function isCalendarNoteType(type: string | undefined): type is CalendarNoteType {
  return type === 'public_holiday' || type === 'transfer_workday';
}

function getHolidayName(record: HolidayRecord, locale: Locale) {
  if (locale === 'zh') {
    return record.name_cn ?? record.name;
  }

  return record.name_en ?? record.name;
}

async function getHolidayRecordsForYear(year: number) {
  const cached = holidayRecordCache.get(year);

  if (cached) {
    return cached;
  }

  const response = await fetch(`https://unpkg.com/holiday-calendar/data/CN/${year}.json`);

  if (!response.ok) {
    throw new Error(`Failed to fetch holiday data for ${year}`);
  }

  const payload = (await response.json()) as { dates?: HolidayRecord[] };
  const records = Array.isArray(payload.dates) ? payload.dates : [];
  holidayRecordCache.set(year, records);
  return records;
}

export async function getHolidaysForYear(year: number, locale: Locale): Promise<HolidayMap> {
  const cacheKey = `${year}:${locale}`;
  const cached = holidayCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const records = await getHolidayRecordsForYear(year);
  const holidays = new Map<string, CalendarNote>();

  for (const record of records) {
    if (!isCalendarNoteType(record.type)) {
      continue;
    }

    holidays.set(record.date, {
      name: getHolidayName(record, locale),
      type: record.type
    });
  }

  holidayCache.set(cacheKey, holidays);
  return holidays;
}
