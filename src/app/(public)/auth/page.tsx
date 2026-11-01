import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function AuthPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <div className="auth-shell">
        <div className="auth-card">
          <p className="text-[13px]">صفحه‌ی ورود در گام بعد وصل می‌شود.</p>
        </div>
      </div>
    </Suspense>
  );
}
