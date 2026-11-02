import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatRate, type ItemSummary } from "@/lib/enquiries";
import { cn } from "@/lib/utils";

const chartConfig = {
  avg: { label: "Avg rate", color: "var(--chart-1)" },
  max: { label: "High", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function ItemRateBoard({
  items,
  onOpenItem,
}: {
  items: ItemSummary[];
  onOpenItem?: (itemKey: string) => void;
}) {
  const data = items
    .filter((i) => i.avg !== null)
    .slice(0, 8)
    .map((i) => ({ item: i.item, avg: i.avg, max: i.max }));

  return (
    <section className="surface overflow-hidden">
      <header className="border-b border-border px-5 py-4">
        <p className="eyebrow text-muted-foreground">Item rate board</p>
        <h2 className="mt-1 text-xl font-bold">Item-wise rate</h2>
      </header>

      {data.length > 0 && (
        <div className="px-3 pt-4">
          <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full">
            <BarChart data={data} margin={{ left: 0, right: 8, top: 4 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="item" tickLine={false} axisLine={false} fontSize={11} interval={0} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={44}
                fontSize={11}
                domain={["dataMin - 200", "dataMax + 100"]}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="avg" fill="var(--color-avg)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="max" fill="var(--color-max)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="eyebrow text-muted-foreground">
            <th className="px-5 py-2 text-left font-medium">Item</th>
            <th className="px-2 py-2 text-right font-medium">Enq.</th>
            <th className="px-2 py-2 text-right font-medium">Low</th>
            <th className="px-2 py-2 text-right font-medium">Avg</th>
            <th className="px-5 py-2 text-right font-medium">High</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((i) => (
            <tr
              key={i.itemKey}
              onClick={() => onOpenItem?.(i.itemKey)}
              className={cn("hover:bg-muted/50", onOpenItem && "cursor-pointer")}
            >
              <td className="px-5 py-2.5">
                <p className="font-medium hover:text-primary transition-colors">{i.item}</p>
                <p className="text-xs text-muted-foreground">
                  {i.brokers} broker{i.brokers === 1 ? "" : "s"}
                </p>
              </td>
              <td className="num px-2 text-right">{i.count}</td>
              <td className="num px-2 text-right text-muted-foreground">{formatRate(i.min)}</td>
              <td className="num px-2 text-right font-semibold">{formatRate(i.avg)}</td>
              <td className="num px-5 text-right text-muted-foreground">{formatRate(i.max)}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                No items
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
