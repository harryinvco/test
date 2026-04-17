"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CLIENT_STATUS, INDUSTRY } from "@/lib/enums";
import { formatEuros } from "@/lib/money";
import type { Client } from "@/db/schema";

type SortKey = "name" | "company" | "status" | "mrrCents" | "contractStartDate" | "createdAt";

export function ClientsTable({ clients }: { clients: Client[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [industry, setIndustry] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [asc, setAsc] = useState(false);

  const filtered = useMemo(() => {
    const qLower = q.toLowerCase();
    return clients
      .filter((c) => {
        if (status !== "all" && c.status !== status) return false;
        if (industry !== "all" && c.industry !== industry) return false;
        if (!qLower) return true;
        return (
          c.name.toLowerCase().includes(qLower) ||
          (c.company ?? "").toLowerCase().includes(qLower) ||
          c.email.toLowerCase().includes(qLower)
        );
      })
      .sort((a, b) => {
        const av = a[sortKey] ?? 0;
        const bv = b[sortKey] ?? 0;
        if (av === bv) return 0;
        const cmp = av < bv ? -1 : 1;
        return asc ? cmp : -cmp;
      });
  }, [clients, q, status, industry, sortKey, asc]);

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
        <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {CLIENT_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
              <TableHead onClick={() => toggleSort("status")} className="cursor-pointer">Status</TableHead>
              <TableHead onClick={() => toggleSort("mrrCents")} className="cursor-pointer text-right">MRR</TableHead>
              <TableHead onClick={() => toggleSort("contractStartDate")} className="cursor-pointer">Contract start</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell><Link href={`/clients/${c.id}`} className="hover:underline">{c.name}</Link></TableCell>
                <TableCell>{c.company ?? "—"}</TableCell>
                <TableCell><Badge>{c.status}</Badge></TableCell>
                <TableCell className="text-right">{formatEuros(c.mrrCents)}</TableCell>
                <TableCell>{c.contractStartDate}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No clients match.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
