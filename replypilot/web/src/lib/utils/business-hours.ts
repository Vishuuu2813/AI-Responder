interface BusinessHoursSchedule {
  day: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

interface BusinessHoursConfig {
  enabled: boolean;
  timezone: string;
  awayMessage: string;
  schedule: BusinessHoursSchedule[];
}

interface BusinessHoursResult {
  isOpen: boolean;
  awayMessage?: string;
}

export function isWithinBusinessHours(config: BusinessHoursConfig): BusinessHoursResult {
  if (!config.enabled) {
    return { isOpen: true };
  }

  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: config.timezone || "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  };

  const formatter = new Intl.DateTimeFormat("en-US", options);
  const parts = formatter.formatToParts(now);

  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };

  const weekdayStr = parts.find((p) => p.type === "weekday")?.value || "Mon";
  const currentDay = weekdayMap[weekdayStr] ?? 1;
  const currentHour = parts.find((p) => p.type === "hour")?.value || "09";
  const currentMinute = parts.find((p) => p.type === "minute")?.value || "00";
  const currentTime = `${currentHour}:${currentMinute}`;

  const daySchedule = config.schedule.find((s) => s.day === currentDay);

  if (!daySchedule || !daySchedule.isOpen) {
    return { isOpen: false, awayMessage: config.awayMessage };
  }

  if (currentTime >= daySchedule.openTime && currentTime <= daySchedule.closeTime) {
    return { isOpen: true };
  }

  return { isOpen: false, awayMessage: config.awayMessage };
}
