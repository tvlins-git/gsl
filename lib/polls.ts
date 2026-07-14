export type PollResponseValue = 'yes' | 'maybe' | 'no';

export interface SlotScore {
  slotId: string;
  yesCount: number;
  maybeCount: number;
  noCount: number;
  score: number;
  everyoneAvailable: boolean;
  totalMembers: number;
}

export interface PollResponseInput {
  slotId: string;
  memberId: string;
  response: PollResponseValue;
}

export function computeSlotScores(
  slotIds: string[],
  responses: PollResponseInput[],
  totalMembers: number
): SlotScore[] {
  return slotIds.map((slotId) => {
    const slotResponses = responses.filter((r) => r.slotId === slotId);
    const yesCount = slotResponses.filter((r) => r.response === 'yes').length;
    const maybeCount = slotResponses.filter((r) => r.response === 'maybe').length;
    const noCount = slotResponses.filter((r) => r.response === 'no').length;
    const score = yesCount * 2 + maybeCount;

    return {
      slotId,
      yesCount,
      maybeCount,
      noCount,
      score,
      everyoneAvailable: totalMembers > 0 && yesCount === totalMembers,
      totalMembers,
    };
  }).sort((a, b) => b.score - a.score || b.yesCount - a.yesCount);
}

export function formatSlotTime(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const dateOpts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

  const dateStr = start.toLocaleDateString(undefined, dateOpts);
  const startTime = start.toLocaleTimeString(undefined, timeOpts);
  const endTime = end.toLocaleTimeString(undefined, timeOpts);

  return `${dateStr} · ${startTime}–${endTime}`;
}

export function responseLabel(response: PollResponseValue): string {
  switch (response) {
    case 'yes': return 'Available';
    case 'maybe': return 'Maybe';
    case 'no': return 'Not available';
  }
}

export function responseEmoji(response: PollResponseValue): string {
  switch (response) {
    case 'yes': return '✓';
    case 'maybe': return '?';
    case 'no': return '✗';
  }
}

export type PollSlotTimes = { startsAt: string; endsAt: string };
export type PollSlotParseResult = PollSlotTimes | { error: string };

/** Build slot start/end from date (YYYY-MM-DD) and times (HH:mm). */
export function buildPollSlot(
  dateInput: string,
  startTimeInput: string,
  endTimeInput: string
): PollSlotParseResult {
  const date = dateInput.trim();
  const startTime = startTimeInput.trim();
  const endTime = endTimeInput.trim();

  if (!date) {
    return { error: 'Enter a date (YYYY-MM-DD)' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: 'Date must be YYYY-MM-DD (e.g. 2026-09-19)' };
  }

  const timePattern = /^(\d{1,2}):(\d{2})$/;
  const startMatch = startTime.match(timePattern);
  const endMatch = endTime.match(timePattern);
  if (!startMatch || !endMatch) {
    return { error: 'Times must be HH:mm (e.g. 17:00)' };
  }

  const startHour = Number(startMatch[1]);
  const startMin = Number(startMatch[2]);
  const endHour = Number(endMatch[1]);
  const endMin = Number(endMatch[2]);
  if (startHour > 23 || startMin > 59 || endHour > 23 || endMin > 59) {
    return { error: 'Invalid time — use 00:00 to 23:59' };
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const start = new Date(`${date}T${pad(startHour)}:${pad(startMin)}:00`);
  const end = new Date(`${date}T${pad(endHour)}:${pad(endMin)}:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: 'Invalid date or time' };
  }
  if (end <= start) {
    return { error: 'End time must be after start time' };
  }

  return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}

export function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatTimeInput(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

/** Build a slot from Date objects; default 2-hour duration from start time. */
export function buildPollSlotFromDates(
  date: Date,
  startTime: Date,
  durationHours = 2
): PollSlotParseResult {
  return buildPollSlot(
    formatDateInput(date),
    formatTimeInput(startTime),
    formatTimeInput(new Date(startTime.getTime() + durationHours * 60 * 60 * 1000))
  );
}

/** Summarize who marked at least one slot as available (yes). */
export function summarizePollAcceptance(
  responses: PollResponseInput[],
  memberNamesById: Record<string, string>
): string {
  const yesByMember = new Map<string, number>();
  const respondedMembers = new Set<string>();

  for (const r of responses) {
    respondedMembers.add(r.memberId);
    if (r.response === 'yes') {
      yesByMember.set(r.memberId, (yesByMember.get(r.memberId) ?? 0) + 1);
    }
  }

  if (respondedMembers.size === 0) {
    return 'No responses yet';
  }

  const available = [...yesByMember.entries()].map(([id, count]) => {
    const name = memberNamesById[id] ?? 'Unknown';
    return count > 1 ? `${name} (${count} slots)` : name;
  });

  if (available.length === 0) {
    return `${respondedMembers.size} responded — no one available yet`;
  }

  return `Available: ${available.join(', ')}`;
}
