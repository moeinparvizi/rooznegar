"use client";

import { DataGate } from "@/components/auth/DataGate";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DataGate>{children}</DataGate>;
}
