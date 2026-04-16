import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm rounded-xl border bg-background p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Innovaco Command Center</h1>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
