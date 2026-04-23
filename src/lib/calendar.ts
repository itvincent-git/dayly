import holidaySeed2026 from '../data/holidays/CN/2026.min.json';
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

type HolidayPayload = {
  year?: number;
  dates?: HolidayRecord[];
};

type StoredHolidayRecords = {
  records: HolidayRecord[];
  fetchedAt: number;
  source: 'seed' | 'remote';
};

const holidayCache = new Map<string, HolidayMap>();
const holidayRecordCache = new Map<number, StoredHolidayRecords>();
const holidayRefreshTasks = new Map<number, Promise<StoredHolidayRecords | null>>();

const holidaySeedPayloads: HolidayPayload[] = [holidaySeed2026];
const holidaySeedRecordsByYear = new Map<number, HolidayRecord[]>();

const holidayRecordStorageVersion = 'v1';
const holidayRecordRefreshIntervalMs = 30 * 24 * 60 * 60 * 1000;
const holidayRequestTimeoutMs = 8000;
const holidayRemoteSources = [
  'https://unpkg.com/holiday-calendar/data/CN',
  'https://cdn.jsdelivr.net/npm/holiday-calendar/data/CN'
] as const;

for (const payload of holidaySeedPayloads) {
  if (typeof payload.year === 'number' && Array.isArray(payload.dates)) {
    holidaySeedRecordsByYear.set(payload.year, payload.dates);
  }
}

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

function getHolidayRecordStorageKey(year: number) {
  return `dayly:holiday-records:${holidayRecordStorageVersion}:${year}`;
}

function getLocalStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isHolidayRecord(value: unknown): value is HolidayRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return typeof record.date === 'string' && typeof record.name === 'string';
}

function normalizeHolidayRecords(records: unknown) {
  if (!Array.isArray(records)) {
    return [];
  }

  return records.filter(isHolidayRecord);
}

function invalidateHolidayMapCache(year: number) {
  for (const locale of ['zh', 'en'] as const) {
    holidayCache.delete(`${year}:${locale}`);
  }
}

function cacheHolidayRecords(year: number, snapshot: StoredHolidayRecords) {
  holidayRecordCache.set(year, snapshot);
  invalidateHolidayMapCache(year);
}

function readStoredHolidayRecords(year: number) {
  const storage = getLocalStorage();

  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(getHolidayRecordStorageKey(year));

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as {
      records?: unknown;
      fetchedAt?: unknown;
      source?: unknown;
    };

    if (!Array.isArray(parsed.records)) {
      return null;
    }

    const records = normalizeHolidayRecords(parsed.records);
    const fetchedAt = typeof parsed.fetchedAt === 'number' ? parsed.fetchedAt : 0;
    const source = parsed.source === 'seed' ? 'seed' : 'remote';

    return { records, fetchedAt, source } satisfies StoredHolidayRecords;
  } catch {
    return null;
  }
}

function writeStoredHolidayRecords(year: number, snapshot: StoredHolidayRecords) {
  const storage = getLocalStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(getHolidayRecordStorageKey(year), JSON.stringify(snapshot));
  } catch {
    // Ignore persistence failures and continue with in-memory data.
  }
}

function getSeedHolidayRecords(year: number) {
  const records = holidaySeedRecordsByYear.get(year);

  if (!records) {
    return null;
  }

  return {
    records,
    fetchedAt: Date.now(),
    source: 'seed'
  } satisfies StoredHolidayRecords;
}

function shouldRefreshHolidayRecords(snapshot: StoredHolidayRecords) {
  return Date.now() - snapshot.fetchedAt >= holidayRecordRefreshIntervalMs;
}

async function fetchRemoteHolidayRecords(year: number) {
  for (const baseUrl of holidayRemoteSources) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, holidayRequestTimeoutMs);

    try {
      const response = await fetch(`${baseUrl}/${year}.json`, { signal: controller.signal });

      if (!response.ok) {
        continue;
      }

      const payload = (await response.json()) as HolidayPayload;

      return {
        records: normalizeHolidayRecords(payload.dates),
        fetchedAt: Date.now(),
        source: 'remote'
      } satisfies StoredHolidayRecords;
    } catch {
      // Try the next source on timeout or network failure.
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  return null;
}

async function refreshHolidayRecords(year: number) {
  const existingTask = holidayRefreshTasks.get(year);

  if (existingTask) {
    return existingTask;
  }

  const task = fetchRemoteHolidayRecords(year)
    .then((snapshot) => {
      if (!snapshot) {
        return null;
      }

      cacheHolidayRecords(year, snapshot);
      writeStoredHolidayRecords(year, snapshot);
      return snapshot;
    })
    .catch(() => null)
    .finally(() => {
      holidayRefreshTasks.delete(year);
    });

  holidayRefreshTasks.set(year, task);
  return task;
}

async function getHolidayRecordsForYear(year: number) {
  const cached = holidayRecordCache.get(year);

  if (cached) {
    if (shouldRefreshHolidayRecords(cached)) {
      void refreshHolidayRecords(year);
    }

    return cached.records;
  }

  const stored = readStoredHolidayRecords(year);

  if (stored) {
    cacheHolidayRecords(year, stored);

    if (shouldRefreshHolidayRecords(stored)) {
      void refreshHolidayRecords(year);
    }

    return stored.records;
  }

  const seed = getSeedHolidayRecords(year);

  if (seed) {
    cacheHolidayRecords(year, seed);
    writeStoredHolidayRecords(year, seed);
    return seed.records;
  }

  const refreshed = await refreshHolidayRecords(year);
  return refreshed?.records ?? [];
}

function buildHolidayMap(records: HolidayRecord[], locale: Locale) {
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

  return holidays;
}

export async function getHolidaysForYear(year: number, locale: Locale): Promise<HolidayMap> {
  const cacheKey = `${year}:${locale}`;
  const cached = holidayCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const records = await getHolidayRecordsForYear(year);
  const holidays = buildHolidayMap(records, locale);

  holidayCache.set(cacheKey, holidays);
  return holidays;
}

export async function refreshHolidaysForYear(year: number, locale: Locale): Promise<HolidayMap> {
  const snapshot = await refreshHolidayRecords(year);

  if (!snapshot) {
    throw new Error(`Unable to refresh holiday records for ${year}`);
  }

  const holidays = buildHolidayMap(snapshot.records, locale);
  holidayCache.set(`${year}:${locale}`, holidays);
  return holidays;
}
