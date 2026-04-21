"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function DraftProposalSheet({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scopeBrief, setScopeBrief] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const brief = scopeBrief.trim();
    if (!brief) return;
    startTransition(async () => {
      // Save brief in sessionStorage, navigate; the new-proposal page reads it
      // and starts streaming.
      const key = `m3:draft:${leadId}`;
      sessionStorage.setItem(key, brief);
      setOpen(false);
      router.push(`/leads/${leadId}/proposals/new?k=${encodeURIComponent(key)}`);
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button>Draft proposal</Button>} />
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Draft proposal</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 py-4">
          <Label>Scope brief</Label>
          <Textarea
            rows={8}
            value={scopeBrief}
            onChange={(e) => setScopeBrief(e.target.value)}
            placeholder="e.g. AI chatbot for their front desk, 3-month pilot, €8k. Suggest discovery → build → launch phases."
            maxLength={2000}
          />
          <div className="text-xs text-muted-foreground">{scopeBrief.length}/2000</div>
          <Button onClick={submit} disabled={pending || !scopeBrief.trim()}>
            {pending ? "Opening…" : "Generate"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
