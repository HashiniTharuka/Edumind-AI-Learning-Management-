import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border bg-card shadow-sm", className)} {...props} />;
}

export function Badge({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "default" | "success" | "muted" }) {
  const tones = {
    default: "bg-accent text-accent-foreground",
    success: "bg-success/15 text-success",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}
      {...props}
    />
  );
}

export function StatCard({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-sm">{label}</span>
        {icon}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </Card>
  );
}
