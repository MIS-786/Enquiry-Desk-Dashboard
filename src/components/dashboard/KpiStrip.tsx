import { ArrowDownRight, ArrowUpRight, CalendarClock, IndianRupee, Users } from "lucide-react";

import { formatRate, type Enquiry, rateStats } from "@/lib/enquiries";

export function KpiStrip({ list, todayCount }: { list: Enquiry[]; todayCount: number }) {
  const stats = rateStats(list);
  const brokers = new Set(list.map((e) => e.brokerKey)).size;
  const purchase = list.filter((e) => e.enquiryFor === "PURCHASE").length;
  const sale = list.filter((e) => e.enquiryFor === "SALE").length;

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
      <div className="surface-ink relative overflow-hidden p-5 animate-rise">
        <p className="eyebrow text-ink-muted">Total enquiries</p>
        <p className="num mt-2 text-5xl font-semibold">{list.length}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <ArrowDownRight className="size-4 text-turmeric" />
            Purchase <b className="num">{purchase}</b>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ArrowUpRight className="size-4 text-turmeric" />
            Sale <b className="num">{sale}</b>
          </span>
          {list.length - purchase - sale > 0 && (
            <span className="text-ink-muted">
              Not set <b className="num">{list.length - purchase - sale}</b>
            </span>
          )}
        </div>
        <div className="pointer-events-none absolute -right-6 -top-6 size-32 rounded-full border-[14px] border-turmeric/20" />
      </div>

      <Kpi
        icon={<Users className="size-4" />}
        label="Active brokers"
        value={String(brokers)}
        hint="Brokers with enquiries"
        delay="60ms"
      />
      <Kpi
        icon={<IndianRupee className="size-4" />}
        label="Average rate"
        value={formatRate(stats.avg)}
        hint={
          stats.min !== null
            ? `${formatRate(stats.min)} – ${formatRate(stats.max)}`
            : "No rates yet"
        }
        delay="120ms"
      />
      <Kpi
        icon={<CalendarClock className="size-4" />}
        label="Today"
        value={String(todayCount)}
        hint="Enquiries received today"
        delay="180ms"
      />
    </section>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  delay: string;
}) {
  return (
    <div className="surface p-5 animate-rise" style={{ animationDelay: delay }}>
      <div className="flex items-center justify-between text-muted-foreground">
        <p className="eyebrow">{label}</p>
        <span className="grid size-7 place-items-center rounded-full bg-secondary text-secondary-foreground">
          {icon}
        </span>
      </div>
      <p className="num mt-2 text-3xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
