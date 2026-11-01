"use client";

import { AppShell } from "@/components/AppShell";

export default function PlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
