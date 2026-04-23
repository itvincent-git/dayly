export type Locale = 'zh' | 'en';

export const localeStorageKey = 'dayly-locale';

export const messages = {
  zh: {
    appName: 'Dayly',
    calendarLabel: '中国节假日日历',
    autostart: '开机自启动',
    autostartHint: '登录 macOS 后自动打开',
    refreshHolidays: '手动刷新节日数据',
    refreshHolidaysHint: (year: number) => `重新拉取 ${year} 年节假日安排并更新本地缓存`,
    refreshNow: '立即刷新',
    refreshing: '刷新中…',
    refreshSuccess: '节日数据已更新',
    refreshError: '刷新失败，已保留当前数据',
    enabled: '已开启',
    disabled: '未开启',
    today: '今天',
    holiday: '节假日',
    holidayAccent: '法定节假日',
    workdayAccent: '补班',
    holidayStatus: '休',
    workdayStatus: '班',
    monthSummary: (holidayCount: number, workdayCount: number) => {
      if (holidayCount === 0 && workdayCount === 0) {
        return '本月暂无节假日或补班安排';
      }

      const parts = [];

      if (holidayCount > 0) {
        parts.push(`${holidayCount} 个节假日`);
      }

      if (workdayCount > 0) {
        parts.push(`${workdayCount} 天补班`);
      }

      return `本月 ${parts.join(' · ')}`;
    },
    weekendLabel: '周末柔化',
    monthOverview: '悬浮日历视图',
    settings: '设置',
    settingsTitle: '应用设置',
    settingsDescription: '在这里调整语言与启动行为',
    openSettings: '打开设置',
    back: '返回',
    backToCalendar: '返回日历',
    languageLabel: '语言',
    languageHint: '切换界面显示语言',
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    holidayUnavailable: '节假日数据暂不可用'
  },
  en: {
    appName: 'Dayly',
    calendarLabel: 'Chinese Holiday Calendar',
    autostart: 'Launch at Login',
    autostartHint: 'Start automatically after signing in to macOS',
    refreshHolidays: 'Refresh Holiday Data',
    refreshHolidaysHint: (year: number) => `Fetch the latest ${year} holiday schedule and update the local cache`,
    refreshNow: 'Refresh Now',
    refreshing: 'Refreshing…',
    refreshSuccess: 'Holiday data updated',
    refreshError: 'Refresh failed, keeping current data',
    enabled: 'Enabled',
    disabled: 'Disabled',
    today: 'Today',
    holiday: 'Holiday',
    holidayAccent: 'Public Holidays',
    workdayAccent: 'Transfer Workdays',
    holidayStatus: 'OFF',
    workdayStatus: 'WORK',
    monthSummary: (holidayCount: number, workdayCount: number) => {
      if (holidayCount === 0 && workdayCount === 0) {
        return 'No holiday or transfer workday this month';
      }

      const parts = [];

      if (holidayCount > 0) {
        parts.push(`${holidayCount} holidays`);
      }

      if (workdayCount > 0) {
        parts.push(`${workdayCount} workdays`);
      }

      return `${parts.join(' · ')} this month`;
    },
    weekendLabel: 'Weekend tone shift',
    monthOverview: 'Floating calendar view',
    settings: 'Settings',
    settingsTitle: 'App Settings',
    settingsDescription: 'Adjust language and startup behavior here',
    openSettings: 'Open settings',
    back: 'Back',
    backToCalendar: 'Back to calendar',
    languageLabel: 'Language',
    languageHint: 'Choose the interface language',
    weekDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    holidayUnavailable: 'Holiday data is unavailable'
  }
} as const;
