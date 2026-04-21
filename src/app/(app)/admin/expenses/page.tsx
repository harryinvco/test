import { getExpenses } from "@/lib/expenses/queries";
import { getClients } from "@/lib/clients/queries";
import { ExpensesTable } from "@/components/expenses/ExpensesTable";
import { ExpenseInlineForm } from "@/components/expenses/ExpenseInlineForm";

export default async function ExpensesPage() {
  const [rows, clients] = await Promise.all([getExpenses(), getClients()]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
      <ExpenseInlineForm clients={clients.map((c) => ({ id: c.id, name: c.name }))} />
      <ExpensesTable rows={rows} />
    </div>
  );
}
