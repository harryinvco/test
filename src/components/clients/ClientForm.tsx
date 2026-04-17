"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientCreate, type ClientCreateInput } from "@/lib/clients/schema";
import { INDUSTRY, CLIENT_STATUS } from "@/lib/enums";
import { createClient as createClientAction, updateClient } from "@/lib/clients/actions";
import { eurosToCents, centsToEuros } from "@/lib/money";
import type { Client } from "@/db/schema";

type Props = { mode: "create" | "edit"; initial?: Client };

type FormValues = {
  name: string;
  company: string;
  email: string;
  phone: string;
  industry: ClientCreateInput["industry"];
  status: NonNullable<ClientCreateInput["status"]>;
  contract_start_date: string;
  mrr_euros: string;
};

export function ClientForm({ mode, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const today = new Date().toISOString().slice(0, 10);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      name: initial?.name ?? "",
      company: initial?.company ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      industry: (initial?.industry as FormValues["industry"]) ?? "other",
      status: (initial?.status as FormValues["status"]) ?? "active",
      contract_start_date: initial?.contractStartDate ?? today,
      mrr_euros: centsToEuros(initial?.mrrCents),
    },
  });

  function onSubmit(data: FormValues) {
    const input: ClientCreateInput = {
      name: data.name,
      company: data.company || null,
      email: data.email,
      phone: data.phone || null,
      industry: data.industry,
      status: data.status,
      contract_start_date: data.contract_start_date,
      mrr_cents: eurosToCents(data.mrr_euros),
    };
    const parsed = ClientCreate.safeParse(input);
    if (!parsed.success) {
      console.error(parsed.error);
      return;
    }
    startTransition(async () => {
      if (mode === "create") {
        const row = await createClientAction(parsed.data);
        router.push(`/clients/${row.id}`);
      } else if (initial) {
        await updateClient(initial.id, parsed.data);
        router.push(`/clients/${initial.id}`);
        router.refresh();
      }
    });
  }

  const industry = watch("industry");
  const status = watch("status");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" error={errors.name?.message}>
          <Input {...register("name", { required: "Required" })} autoFocus />
        </Field>
        <Field label="Company"><Input {...register("company")} /></Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" {...register("email", { required: "Required" })} />
        </Field>
        <Field label="Phone"><Input {...register("phone")} /></Field>
        <Field label="Industry">
          <Select value={industry} onValueChange={(v) => v && setValue("industry", v as FormValues["industry"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {INDUSTRY.map((i) => <SelectItem key={i} value={i}>{i.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={status} onValueChange={(v) => v && setValue("status", v as FormValues["status"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CLIENT_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Contract start date">
          <Input type="date" {...register("contract_start_date", { required: "Required" })} />
        </Field>
        <Field label="MRR (EUR / month)">
          <Input type="number" step="0.01" {...register("mrr_euros")} />
        </Field>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : mode === "create" ? "Create client" : "Save changes"}
      </Button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
