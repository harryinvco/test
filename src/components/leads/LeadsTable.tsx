"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LEAD_STAGE, INDUSTRY } from "@/lib/enums";
import { formatEuros } from "@/lib/money";
import type { Lead } from "@/db/schema";

type SortKey = "name" | "company" | "stage" | "estimatedValueCents" | "followUpDate" | "createdAt";

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<string>("all");
  const [industry, setIndustry] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [asc, setAsc] = useState(false);

  const filtered = useMemo(() => {
    const qLower = q.toLowerCase();
    return leads
      .filter((l) => {
        if (stage !== "all" && l.stage !== stage) return false;
        if (industry !== "all" && l.industry !== industry) return false;
        if (!qLower) return true;
        return (
          l.name.toLowerCase().includes(qLower) ||
          (l.company ?? "").toLowerCase().includes(qLower) ||
          l.email.toLowerCase().includes(qLower)
        );
      })
      .sort((a, b) => {
        const av = a[sortKey] ?? 0;
        const bv = b[sortKey] ?? 0;
        if (av === bv) return 0;
        const cmp = av < bv ? -1 : 1;
        return asc ? cmp : -cmp;
      });
  }, [leads, q, stage, industry, sortKey, asc]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setAsc(!asc);
    else {
      setSortKey(k);
      setAsc(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Input placeholder="Search name, company, email…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={stage} onValueChange={(v) => setStage(v ?? "all")}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Stage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {LEAD_STAGE.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={industry} onValueChange={(v) => setIndustry(v ?? "all")}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Industry" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All industries</SelectItem>
            {INDUSTRY.map((i) => <SelectItem key={i} value={i}>{i.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => toggleSort("name")} className="cursor-pointer">Name</TableHead>
              <TableHead onClick={() => toggleSort("company")} className="cursor-pointer">Company</TableHead>
              <TableHead onClick={() => toggleSort("stage")} className="cursor-pointer">Stage</TableHead>
              <TableHead onClick={() => toggleSort("estimatedValueCents")} className="cursor-pointer text-right">Value</TableHead>
              <TableHead onClick={() => toggleSort("followUpDate")} className="cursor-pointer">Follow-up</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((l) => (
              <TableRow key={l.id} className="cursor-pointer">
                <TableCell><Link href={`/leads/${l.id}`} className="hover:underline">{l.name}</Link></TableCell>
                <TableCell>{l.company ?? "—"}</TableCell>
                <TableCell><Badge>{l.stage.replace("_", " ")}</Badge></TableCell>
                <TableCell className="text-right">{formatEuros(l.estimatedValueCents)}</TableCell>
                <TableCell>{l.followUpDate ?? "—"}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                  No leads match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
