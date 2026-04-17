"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeadCreate, type LeadCreateInput } from "@/lib/leads/schema";
import { INDUSTRY, SOURCE, LEAD_STAGE } from "@/lib/enums";
import { createLead, updateLead } from "@/lib/leads/actions";
import { eurosToCents, centsToEuros } from "@/lib/money";
import type { Lead } from "@/db/schema";

type Props = {
  mode: "create" | "edit";
  initial?: Lead;
};

type FormValues = {
  name: string;
  company: string;
  email: string;
  phone: string;
  industry: LeadCreateInput["industry"];
  source: LeadCreateInput["source"];
  stage: NonNullable<LeadCreateInput["stage"]>;
  estimated_value_euros: string;
  follow_up_date: string;
};

export function LeadForm({ mode, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      name: initial?.name ?? "",
      company: initial?.company ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      industry: (initial?.industry as FormValues["industry"]) ?? "other",
      source: (initial?.source as FormValues["source"]) ?? "inbound",
      stage: (initial?.stage as FormValues["stage"]) ?? "new",
      estimated_value_euros: centsToEuros(initial?.estimatedValueCents),
      follow_up_date: initial?.followUpDate ?? "",
    },
  });

  function onSubmit(data: FormValues) {
    const input: LeadCreateInput = {
      name: data.name,
      company: data.company || null,
      email: data.email,
      phone: data.phone || null,
      industry: data.industry,
      source: data.source,
      stage: data.stage,
      estimated_value_cents: eurosToCents(data.estimated_value_euros),
      follow_up_date: data.follow_up_date || null,
    };
    const parsed = LeadCreate.safeParse(input);
    if (!parsed.success) {
      console.error(parsed.error);
      return;
    }

    startTransition(async () => {
      if (mode === "create") {
        const row = await createLead(parsed.data);
        router.push(`/leads/${row.id}`);
      } else if (initial) {
        await updateLead(initial.id, parsed.data);
        router.push(`/leads/${initial.id}`);
        router.refresh();
      }
    });
  }

  const industry = watch("industry");
  const source = watch("source");
  const stage = watch("stage");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" error={errors.name?.message}>
          <Input {...register("name", { required: "Required" })} autoFocus />
        </Field>
        <Field label="Company">
          <Input {...register("company")} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" {...register("email", { required: "Required" })} />
        </Field>
        <Field label="Phone">
          <Input {...register("phone")} />
        </Field>
        <Field label="Industry">
          <Select value={industry} onValueChange={(v) => v && setValue("industry", v as FormValues["industry"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {INDUSTRY.map((i) => <SelectItem key={i} value={i}>{i.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Source">
          <Select value={source} onValueChange={(v) => v && setValue("source", v as FormValues["source"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SOURCE.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Stage">
          <Select value={stage} onValueChange={(v) => v && setValue("stage", v as FormValues["stage"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEAD_STAGE.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Estimated value (EUR)">
          <Input type="number" step="0.01" {...register("estimated_value_euros")} />
        </Field>
        <Field label="Follow-up date">
          <Input type="date" {...register("follow_up_date")} />
        </Field>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : mode === "create" ? "Create lead" : "Save changes"}
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
