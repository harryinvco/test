"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { markInvoiceSent, markInvoicePaid, deleteInvoice } from "@/lib/invoices/actions";
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
import { useState } from "react";

export function InvoiceStatusActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canSend = status === "draft";
  const canPay = status === "sent" || status === "overdue";

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {canSend && (
          <Button
            disabled={pending}
            onClick={() => run(() => markInvoiceSent(id))}
          >
            Mark sent
          </Button>
        )}
        {canPay && (
          <Button
            disabled={pending}
            onClick={() => run(() => markInvoicePaid(id))}
          >
            Mark paid
          </Button>
        )}
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() => setConfirmDelete(true)}
        >
          Delete
        </Button>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the invoice and its line items. Revenue history is
              preserved on paid invoices elsewhere, but this one will be gone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => run(() => deleteInvoice(id))}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
