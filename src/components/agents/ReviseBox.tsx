"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StreamingMarkdown } from "@/components/agents/StreamingMarkdown";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SKIP_CONFIRM_KEY = "revise.skipConfirm";

function readSkipConfirm() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SKIP_CONFIRM_KEY) === "1";
}

function writeSkipConfirm() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SKIP_CONFIRM_KEY, "1");
}

export function ReviseBox({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const [instruction, setInstruction] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  if (streaming) {
    return (
      <StreamingMarkdown
        endpoint={`/api/agents/proposal/${proposalId}/revise`}
        requestBody={{ instruction }}
        onComplete={() => {
          setStreaming(false);
          setInstruction("");
          router.refresh();
        }}
        onError={() => setStreaming(false)}
      />
    );
  }

  function handleRevise() {
    if (readSkipConfirm()) {
      setStreaming(true);
      return;
    }
    setDontAskAgain(false);
    setConfirmOpen(true);
  }

  function handleConfirm() {
    if (dontAskAgain) writeSkipConfirm();
    setConfirmOpen(false);
    setStreaming(true);
  }

  return (
    <>
      <div className="space-y-2 rounded-md border p-4">
        <Label>Revise</Label>
        <Textarea
          rows={3}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="e.g. make it shorter, emphasise pricing, add a discovery phase"
          maxLength={1000}
        />
        <Button disabled={!instruction.trim()} onClick={handleRevise}>
          Revise
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace current draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite the proposal body with a new revision. A run
              history entry is kept either way.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={dontAskAgain}
              onChange={(e) => setDontAskAgain(e.target.checked)}
              className="size-4 rounded border-input accent-primary"
            />
            Don&apos;t ask again
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
