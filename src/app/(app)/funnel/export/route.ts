import { NextResponse } from "next/server";
import { getSessionUser, isModerator } from "@/lib/session";
import { getFunnelData, parseRange, type FunnelData } from "@/lib/funnel";

function esc(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const row = (...cells: (string | number)[]) => cells.map(esc).join(",");

function buildCsv(d: FunnelData): string {
  const lines: string[] = [];
  lines.push(row("2nd Time Around — Funnel export"));
  lines.push(row("Range", d.rangeLabel));
  lines.push(row("Generated", d.refreshedAt));
  lines.push("");

  lines.push(row("KPI", "Value", "Prev period"));
  for (const k of d.kpis) lines.push(row(k.label, k.value, k.prev ?? "n/a"));
  lines.push("");

  lines.push(row("Top searched terms", "Count"));
  for (const t of d.topTerms) lines.push(row(t.query, t.count));
  lines.push("");

  lines.push(row("Zero-result searches", "Count"));
  for (const t of d.zeroResultTerms) lines.push(row(t.query, t.count));
  lines.push("");

  lines.push(row("Category", "For sale", "Wanted", "Donated", "Lost/Found", "Supply", "Searches", "Demand index"));
  for (const c of d.categoryDemand)
    lines.push(row(c.category, c.sell, c.wanted, c.donate, c.lost, c.supply, c.searches, c.demandIndex ?? "n/a"));
  lines.push("");

  lines.push(row("Funnel stage", "Count"));
  for (const s of d.funnel) lines.push(row(s.label, s.count));
  lines.push("");

  lines.push(row("Completion by category", "Completed", "Posted", "Rate %"));
  for (const c of d.health.completionByCategory)
    lines.push(row(c.category, c.completed, c.posted, Math.round((c.completed / c.posted) * 100)));

  return lines.join("\n");
}

export async function GET(request: Request) {
  // Guard the route itself — UI hiding is not enough. 404 (not 403) so the
  // endpoint is indistinguishable from a non-existent page for regular users.
  const user = await getSessionUser();
  if (!user || !(await isModerator(user.id))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const range = parseRange(url.searchParams.get("range") ?? undefined);
  const data = await getFunnelData(range.key, url.searchParams.get("catsort") ?? "");

  return new NextResponse(buildCsv(data), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="funnel-${range.key}.csv"`,
    },
  });
}
