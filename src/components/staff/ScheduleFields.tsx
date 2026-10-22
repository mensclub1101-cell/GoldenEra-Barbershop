import { DAY_NAMES, type WeekSchedule } from "@/lib/schedule";
import type { OpenHours } from "@/lib/shop";

const timeInput =
  "w-full min-w-0 rounded-xl border border-line bg-paper px-1.5 py-2 text-center text-base outline-none focus:border-ink [&::-webkit-calendar-picker-indicator]:hidden";

// The week on a barber's card: tick the days you work and set your hours.
// With nothing saved yet, times start from the shop's hours for that day.
export function ScheduleFields({ schedule, shopHours }: { schedule: WeekSchedule | null; shopHours: OpenHours[] }) {
  const shopDay = (n: number) => shopHours.find((h) => h.days.includes(DAY_NAMES[n]));
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold">My schedule</legend>
      <p className="mb-3 text-xs text-muted">
        Tick the days you work. The website shows your hours and when you&rsquo;re in.
      </p>
      <div className="divide-y divide-line rounded-2xl border border-line">
        {DAY_NAMES.map((day, n) => {
          const saved = schedule?.[n];
          const fallback = shopDay(n);
          return (
            <div key={day} className="grid grid-cols-[4.25rem_1fr_auto_1fr] items-center gap-1.5 px-2.5 py-2">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  name={`day_${n}`}
                  defaultChecked={!!saved}
                  className="h-5 w-5 accent-black"
                  aria-label={`I work ${day}`}
                />
                {day.slice(0, 3)}
              </label>
              <input
                type="time"
                name={`open_${n}`}
                aria-label={`${day} start`}
                defaultValue={saved?.open ?? fallback?.open ?? "10:00"}
                className={timeInput}
              />
              <span className="text-xs text-muted">–</span>
              <input
                type="time"
                name={`close_${n}`}
                aria-label={`${day} end`}
                defaultValue={saved?.close ?? fallback?.close ?? "19:00"}
                className={timeInput}
              />
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
