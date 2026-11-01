"use client";

import { DataGate } from "@/components/auth/DataGate";
import { SyncProvider } from "@/components/sync/SyncProvider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DataGate>
      <SyncProvider>{children}</SyncProvider>
    </DataGate>
  );
}
