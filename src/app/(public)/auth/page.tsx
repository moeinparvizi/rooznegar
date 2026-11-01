import { Suspense } from "react";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { LoadingScreen } from "@/components/LoadingScreen";

export const metadata = { title: "ورود" };

export default function AuthPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <AuthScreen />
    </Suspense>
  );
}
