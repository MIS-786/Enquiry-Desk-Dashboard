import { ChevronRight } from "lucide-react";

import { formatDateTime, formatRate, type BrokerSummary } from "@/lib/enquiries";
import { Chip } from "./TypeBadge";

export function BrokerBoard({
  brokers,
  onOpen,
}: {
  brokers: BrokerSummary[];
  onOpen: (brokerKey: string) => void;
}) {
  const top = Math.max(1, ...brokers.map((b) => b.count));

  return (
    <section className="surface overflow-hidden">
      <header className="flex items-end justify-between border-b border-border px-5 py-4">
        <div>
          <p className="eyebrow text-muted-foreground">Broker-wise deals</p>
          <h2 className="mt-1 text-xl font-bold">Kis broker se kya deal hua</h2>
        </div>
        <span className="num text-sm text-muted-foreground">{brokers.length} brokers</span>
      </header>

      {brokers.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">
          Is filter me koi enquiry nahi mili.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {brokers.map((b, i) => (
            <li key={b.brokerKey}>
              <button
                onClick={() => onOpen(b.brokerKey)}
                className="group grid w-full grid-cols-[2rem_1fr_auto] items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/60"
              >
                <span className="num grid size-8 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                  {initials(b.broker)}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="font-semibold text-foreground">{b.broker}</p>
                    <p className="text-xs text-muted-foreground">
                      Last: {b.lastItem} @ <span className="num">{formatRate(b.lastRate)}</span> ·{" "}
                      {formatDateTime(b.lastAt)}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {b.items.slice(0, 4).map((item) => (
                      <Chip key={item}>{item}</Chip>
                    ))}
                    {b.items.length > 4 && <Chip>+{b.items.length - 4}</Chip>}
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(b.count / top) * 100}%`, transitionDelay: `${i * 40}ms` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="num text-2xl font-semibold leading-none">{b.count}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      avg <span className="num">{formatRate(b.avg)}</span>
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();
}
