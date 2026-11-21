const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const inrCompactFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatINR(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return inrFormatter.format(safe);
}

export function formatINRCompact(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return inrCompactFormatter.format(safe);
}

export function getCurrentDateTimeLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

export function getCurrentYearKey(): string {
  return String(new Date().getFullYear());
}

export function getFutureDate(monthsAhead = 6): string {
  const date = new Date();
  date.setMonth(date.getMonth() + monthsAhead);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getMonthLabel(monthKey: string, short = false): string {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return monthKey;
  const [y, m] = monthKey.split('-').map(Number);
  const date = new Date(y, m - 1, 1);
  return date.toLocaleDateString('en-IN', {
    month: short ? 'short' : 'long',
    year: short ? '2-digit' : 'numeric',
  });
}

export function getLastNMonthKeys(count: number, endMonthKey?: string): string[] {
  const base = endMonthKey && /^\d{4}-\d{2}$/.test(endMonthKey)
    ? (() => {
        const [y, m] = endMonthKey.split('-').map(Number);
        return new Date(y, m - 1, 1);
      })()
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    keys.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  }
  return keys;
}

export function formatDateTimeDisplay(dateTime: string): string {
  if (!dateTime) return '—';
  const parsed = new Date(dateTime);
  if (Number.isNaN(parsed.getTime())) return dateTime;
  const datePart = parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timePart = parsed.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart} · ${timePart}`;
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '—';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
