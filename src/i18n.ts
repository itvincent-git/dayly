export type Locale = 'zh' | 'en';

export const localeStorageKey = 'dayly-locale';

export const messages = {
  zh: {
    appName: 'Dayly',
    calendarLabel: '中国节假日日历',
    autostart: '开机自启动',
    autostartHint: '登录 macOS 后自动打开',
    enabled: '已开启',
    disabled: '未开启',
    today: '今天',
    holiday: '节假日',
    holidayAccent: '法定节假日',
    holidayCount: (count: number) => `本月 ${count} 个节假日`,
    noHoliday: '本月暂无法定节假日',
    weekendLabel: '周末柔化',
    monthOverview: '悬浮日历视图',
    languageLabel: '语言',
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    holidayUnavailable: '节假日数据暂不可用'
  },
  en: {
    appName: 'Dayly',
    calendarLabel: 'Chinese Holiday Calendar',
    autostart: 'Launch at Login',
    autostartHint: 'Start automatically after signing in to macOS',
    enabled: 'Enabled',
    disabled: 'Disabled',
    today: 'Today',
    holiday: 'Holiday',
    holidayAccent: 'Public Holidays',
    holidayCount: (count: number) => `${count} holidays this month`,
    noHoliday: 'No public holidays this month',
    weekendLabel: 'Weekend tone shift',
    monthOverview: 'Floating calendar view',
    languageLabel: 'Language',
    weekDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    holidayUnavailable: 'Holiday data is unavailable'
  }
} as const;
