import { startTransition, useEffect, useMemo, useState } from 'react';
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart';
import {
  addMonths,
  buildCalendarDays,
  getHolidaysForYear,
  getMonthLabel,
  refreshHolidaysForYear,
  type HolidayMap
} from './lib/calendar';
import { localeStorageKey, messages, type Locale } from './i18n';
import appIcon from '../src-tauri/icons/app-icon.svg';

type Page = 'calendar' | 'settings';
type HolidayRefreshState = 'idle' | 'loading' | 'success' | 'error';

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35A1.724 1.724 0 0 0 5.38 7.753c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M14.5 5.5 8 12l6.5 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getInitialLocale(): Locale {
  const savedLocale = localStorage.getItem(localeStorageKey);
  return savedLocale === 'en' ? 'en' : 'zh';
}

function getHolidayLabel(name: string, locale: Locale) {
  if (locale === 'zh') {
    return Array.from(name).slice(0, 2).join('');
  }

  return name;
}

function App() {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);
  const [page, setPage] = useState<Page>('calendar');
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [holidays, setHolidays] = useState<HolidayMap>(new Map());
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const [autostartLoaded, setAutostartLoaded] = useState(false);
  const [holidayRefreshState, setHolidayRefreshState] = useState<HolidayRefreshState>('idle');

  const copy = messages[locale];
  const visibleYear = visibleMonth.getFullYear();
  const days = useMemo(() => buildCalendarDays(visibleMonth, holidays), [visibleMonth, holidays]);
  const monthHolidayCount = useMemo(
    () => days.filter((day) => day.isCurrentMonth && day.note?.type === 'public_holiday').length,
    [days]
  );
  const monthWorkdayCount = useMemo(
    () => days.filter((day) => day.isCurrentMonth && day.note?.type === 'transfer_workday').length,
    [days]
  );

  const monthSummary = copy.monthSummary(monthHolidayCount, monthWorkdayCount);
  const holidayRefreshHint =
    holidayRefreshState === 'loading'
      ? copy.refreshing
      : holidayRefreshState === 'success'
        ? copy.refreshSuccess
        : holidayRefreshState === 'error'
          ? copy.refreshError
          : copy.refreshHolidaysHint(visibleYear);

  useEffect(() => {
    localStorage.setItem(localeStorageKey, locale);
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
  }, [locale]);

  useEffect(() => {
    let cancelled = false;

    void isEnabled()
      .then((value) => {
        if (!cancelled) {
          setAutostartEnabled(value);
          setAutostartLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAutostartEnabled(false);
          setAutostartLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setHolidayRefreshState('idle');

    void getHolidaysForYear(visibleYear, locale)
      .then((result) => {
        if (!cancelled) {
          setHolidays(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHolidays(new Map());
        }
      });

    return () => {
      cancelled = true;
    };
  }, [locale, visibleYear]);

  async function handleAutostartToggle(nextValue: boolean) {
    if (nextValue) {
      await enable();
    } else {
      await disable();
    }

    startTransition(() => {
      setAutostartEnabled(nextValue);
    });
  }

  function changeMonth(offset: number) {
    startTransition(() => {
      setVisibleMonth((current) => addMonths(current, offset));
    });
  }

  async function handleHolidayRefresh() {
    setHolidayRefreshState('loading');

    try {
      const refreshed = await refreshHolidaysForYear(visibleYear, locale);

      startTransition(() => {
        setHolidays(refreshed);
        setHolidayRefreshState('success');
      });
    } catch {
      startTransition(() => {
        setHolidayRefreshState('error');
      });
    }
  }

  return (
    <main className="shell">
      <section className="window-shell">
        <header className="window-header">
          <img className="app-icon" src={appIcon} alt={copy.appName} />

          {page === 'calendar' ? (
            <button
              type="button"
              className="icon-button header-action"
              onClick={() => setPage('settings')}
              aria-label={copy.openSettings}
            >
              <SettingsIcon />
            </button>
          ) : (
            <button
              type="button"
              className="icon-button header-action"
              onClick={() => setPage('calendar')}
              aria-label={copy.backToCalendar}
            >
              <BackIcon />
            </button>
          )}
        </header>

        {page === 'calendar' ? (
          <>
            <section className="hero-grid">
              <article className="glass-card lead-card">
                <p className="section-label">{copy.monthOverview}</p>
                <p className="lead-copy">{monthSummary}</p>
                <div className="lead-tags">
                  <span className="info-pill holiday-pill">{copy.holidayAccent}</span>
                  <span className="info-pill workday-pill">{copy.workdayAccent}</span>
                  <span className="info-pill subtle">{copy.weekendLabel}</span>
                </div>
              </article>
            </section>

            <section className="calendar-panel">
              <div className="calendar-toolbar">
                <button
                  type="button"
                  className="nav-button"
                  onClick={() => changeMonth(-1)}
                  aria-label={locale === 'zh' ? '上个月' : 'Previous month'}
                >
                  ‹
                </button>

                <div className="calendar-heading">
                  <p className="section-label">{copy.appName}</p>
                  <div className="calendar-title">{getMonthLabel(visibleMonth, locale, copy.months)}</div>
                </div>

                <button
                  type="button"
                  className="nav-button"
                  onClick={() => changeMonth(1)}
                  aria-label={locale === 'zh' ? '下个月' : 'Next month'}
                >
                  ›
                </button>
              </div>

              <div className="weekdays">
                {copy.weekDays.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className="grid">
                {days.map((day) => (
                  <article
                    key={day.isoKey}
                    className={[
                      'day-cell',
                      day.isCurrentMonth ? '' : 'muted',
                      day.isWeekend ? 'weekend' : '',
                      day.isToday ? 'today' : '',
                      day.note?.type === 'public_holiday' ? 'public-holiday' : '',
                      day.note?.type === 'transfer_workday' ? 'transfer-workday' : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className="day-header">
                      <div className="day-header-main">
                        <span className="day-number">{day.dayNumber}</span>
                        {day.note ? (
                          <span className={['day-holiday-name', day.note.type].join(' ')}>
                            {getHolidayLabel(day.note.name, locale)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {day.note ? (
                      <div className={['day-note', day.note.type].join(' ')}>
                        <span className="day-note-badge">
                          {day.note.type === 'transfer_workday' ? copy.workdayStatus : copy.holidayStatus}
                        </span>
                      </div>
                    ) : (
                      <div className="day-fade" aria-hidden="true" />
                    )}
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="settings-panel">
            <article className="glass-card settings-card">
              <div className="settings-row">
                <div>
                  <p className="section-label">{copy.languageLabel}</p>
                  <p className="utility-hint">{copy.languageHint}</p>
                </div>

                <div className="language-switch" aria-label={copy.languageLabel}>
                  <button
                    type="button"
                    className={locale === 'zh' ? 'active' : undefined}
                    onClick={() => setLocale('zh')}
                  >
                    中文
                  </button>
                  <button
                    type="button"
                    className={locale === 'en' ? 'active' : undefined}
                    onClick={() => setLocale('en')}
                  >
                    EN
                  </button>
                </div>
              </div>

              <div className="settings-divider" aria-hidden="true" />

              <div className="settings-row">
                <div>
                  <p className="section-label">{copy.refreshHolidays}</p>
                  <p className="utility-hint">{holidayRefreshHint}</p>
                </div>

                <button
                  type="button"
                  className="secondary-button settings-button"
                  disabled={holidayRefreshState === 'loading'}
                  onClick={() => {
                    void handleHolidayRefresh();
                  }}
                >
                  {holidayRefreshState === 'loading' ? copy.refreshing : copy.refreshNow}
                </button>
              </div>

              <div className="settings-divider" aria-hidden="true" />

              <div className="settings-row">
                <div>
                  <p className="section-label">{copy.autostart}</p>
                  <p className="utility-hint">{copy.autostartHint}</p>
                </div>

                <label className={`switch ${autostartLoaded ? '' : 'pending'}`}>
                  <input
                    type="checkbox"
                    checked={autostartEnabled}
                    disabled={!autostartLoaded}
                    onChange={(event) => {
                      void handleAutostartToggle(event.target.checked);
                    }}
                  />
                  <span className="switch-track" aria-hidden="true">
                    <span className="switch-thumb" />
                  </span>
                  <span className="switch-state">{autostartEnabled ? copy.enabled : copy.disabled}</span>
                </label>
              </div>
            </article>
          </section>
        )}
      </section>
    </main>
  );
}

export default App;
