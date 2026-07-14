export interface MonthEntry {
  year: number;
  month: number;
  label: string;
  isCurrent: boolean;
  isNext: boolean;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function generateMonthList(count = 12, fromDate = new Date()): MonthEntry[] {
  const now = fromDate;
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

  const entries: MonthEntry[] = [];
  let year = currentYear;
  let month = currentMonth;

  for (let i = 0; i < count; i++) {
    entries.push({
      year,
      month,
      label: `${MONTH_NAMES[month - 1]} ${year}`,
      isCurrent: year === currentYear && month === currentMonth,
      isNext: year === nextYear && month === nextMonth,
    });

    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return entries;
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}
