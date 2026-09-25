type Point = { label: string; shortLabel: string; value: number };

/**
 * Single-series column chart (server-rendered, no JS). One hue, thin bars with 4px rounded
 * data-ends, 2px gaps, recessive grid, per-bar hover tooltip (hit target = full column),
 * and a table view for screen readers / exact values.
 */
export function BarChart({ data, unit, title }: { data: Point[]; unit: string; title: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  // Round the axis max up to a "nice" number so gridlines land on readable values.
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const niceMax = Math.ceil(max / step) * step;
  const ticks = [niceMax, niceMax / 2, 0];
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <figure>
      <figcaption className="flex items-baseline justify-between gap-4">
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-muted-foreground">
          {total} {unit} total
        </span>
      </figcaption>

      <div className="mt-4 flex gap-2" aria-hidden="true">
        <div className="flex h-48 flex-col justify-between text-right text-xs tabular-nums text-muted-foreground">
          {ticks.map((t) => (
            <span key={t} className="-translate-y-1/2 leading-none first:translate-y-0 last:translate-y-0">
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </span>
          ))}
        </div>
        <div className="relative h-48 flex-1">
          {ticks.map((t, i) => (
            <div
              key={t}
              className="absolute inset-x-0 border-t border-border"
              style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {data.map((d) => (
              <div key={d.label} className="group relative flex h-full flex-1 items-end">
                <div
                  className="w-full rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-80"
                  style={{ height: d.value ? `max(2px, ${(d.value / niceMax) * 100}%)` : 0 }}
                />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border bg-card px-2 py-1 text-xs shadow-md group-hover:block">
                  <div className="text-muted-foreground">{d.label}</div>
                  <div className="font-semibold tabular-nums">
                    {d.value} {unit}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="ml-8 mt-1 flex justify-between text-xs text-muted-foreground" aria-hidden="true">
        <span>{data[0]?.shortLabel}</span>
        <span>{data[Math.floor(data.length / 2)]?.shortLabel}</span>
        <span>{data.at(-1)?.shortLabel}</span>
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted-foreground">View as table</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="py-1 font-medium">Date</th>
              <th className="py-1 text-right font-medium">{unit}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-b last:border-b-0">
                <td className="py-1">{d.label}</td>
                <td className="py-1 text-right tabular-nums">{d.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
