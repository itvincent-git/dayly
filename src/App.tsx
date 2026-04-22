import { startTransition, useEffect, useMemo, useState } from 'react';
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart';
import { addMonths, buildCalendarDays, getHolidaysForYear, getMonthLabel, type HolidayMap } from './lib/calendar';
import { localeStorageKey, messages, type Locale } from './i18n';

type Page = 'calendar' | 'settings';

function getInitialLocale(): Locale {
  const savedLocale = localStorage.getItem(localeStorageKey);
  return savedLocale === 'en' ? 'en' : 'zh';
}

function getHolidayLabel(name: string, locale: Locale) {
  if (locale !== 'zh') {
    return name;
  }

  return Array.from(name).slice(0, 2).join('');
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
    () => days.filter((day) => day.isCurrentMonth && day.holidayName).length,
    [days]
  );

  const today = new Date();
  const todayDay = String(today.getDate()).padStart(2, '0');
  const todayMeta =
    locale === 'zh'
      ? `${today.getFullYear()}年 ${copy.months[today.getMonth()]} · 星期${copy.weekDays[today.getDay()]}`
      : `${copy.weekDays[today.getDay()]} · ${copy.months[today.getMonth()]} ${today.getFullYear()}`;
  const monthSummary = monthHolidayCount > 0 ? copy.holidayCount(monthHolidayCount) : copy.noHoliday;

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
          <div className="title-stack">
            {page === 'calendar' ? (
              <>
                <p className="eyebrow">{copy.calendarLabel}</p>
                <div className="display-cluster">
                  <span className="display-day">{todayDay}</span>
                  <div className="display-copy">
                    <p className="display-meta">{todayMeta}</p>
                    <h1>{getMonthLabel(visibleMonth, locale, copy.months)}</h1>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="eyebrow">{copy.settings}</p>
                <div className="page-heading">
                  <h1>{copy.settingsTitle}</h1>
                  <p className="page-description">{copy.settingsDescription}</p>
                </div>
              </>
            )}
          </div>

          {page === 'calendar' ? (
            <button
              type="button"
              className="secondary-button header-action"
              onClick={() => setPage('settings')}
              aria-label={copy.openSettings}
            >
              {copy.settings}
            </button>
          ) : (
            <button
              type="button"
              className="secondary-button header-action"
              onClick={() => setPage('calendar')}
              aria-label={copy.backToCalendar}
            >
              {copy.back}
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
                  <span className="info-pill">{copy.holidayAccent}</span>
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
                      day.holidayName ? 'holiday' : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className="day-header">
                      <span className="day-number">{day.dayNumber}</span>
                      {day.isToday ? <span className="today-tag">{copy.today}</span> : null}
                    </div>

                    {day.holidayName ? (
                      <div className="holiday-chip">
                        <span className="holiday-bar" aria-hidden="true" />
                        <span className="holiday-name">{getHolidayLabel(day.holidayName, locale)}</span>
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
