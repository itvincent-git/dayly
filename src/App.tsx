import { startTransition, useEffect, useMemo, useState } from 'react';
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart';
import { addMonths, buildCalendarDays, getHolidaysForYear, getMonthLabel, type HolidayMap } from './lib/calendar';
import { localeStorageKey, messages, type Locale } from './i18n';
import appIcon from '../src-tauri/icons/app-icon.svg';

type Page = 'calendar' | 'settings';

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10.9 2.7a1.2 1.2 0 0 1 2.2 0l.5 1.6a7.9 7.9 0 0 1 1.7.7l1.5-.8a1.2 1.2 0 0 1 1.5.3l1.1 1.9a1.2 1.2 0 0 1-.3 1.5l-1.2 1a7.2 7.2 0 0 1 0 2l1.2 1a1.2 1.2 0 0 1 .3 1.5l-1.1 1.9a1.2 1.2 0 0 1-1.5.3l-1.5-.8a7.9 7.9 0 0 1-1.7.7l-.5 1.6a1.2 1.2 0 0 1-2.2 0l-.5-1.6a7.9 7.9 0 0 1-1.7-.7l-1.5.8a1.2 1.2 0 0 1-1.5-.3l-1.1-1.9a1.2 1.2 0 0 1 .3-1.5l1.2-1a7.2 7.2 0 0 1 0-2l-1.2-1a1.2 1.2 0 0 1-.3-1.5l1.1-1.9a1.2 1.2 0 0 1 1.5-.3l1.5.8a7.9 7.9 0 0 1 1.7-.7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
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

function getHolidayLabel(name: string) {
  return name;
}

function App() {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);
  const [page, setPage] = useState<Page>('calendar');
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [holidays, setHolidays] = useState<HolidayMap>(new Map());
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const [autostartLoaded, setAutostartLoaded] = useState(false);

  const copy = messages[locale];
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

    void getHolidaysForYear(visibleMonth.getFullYear(), locale)
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
  }, [locale, visibleMonth]);

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
                      <span className="day-number">{day.dayNumber}</span>
                      {day.isToday ? <span className="today-tag">{copy.today}</span> : null}
                    </div>

                    {day.note ? (
                      <div className={['day-note', day.note.type].join(' ')}>
                        <span className="day-note-badge">
                          {day.note.type === 'transfer_workday' ? copy.workdayStatus : copy.holidayStatus}
                        </span>
                        <span className="day-note-name">{getHolidayLabel(day.note.name)}</span>
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
