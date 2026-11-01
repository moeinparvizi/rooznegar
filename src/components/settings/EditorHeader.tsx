"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";

export function EditorHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="hero">
      <Link href="/me/" className="editor-back">
        <Icon name="arrowLeft" size={14} className="rotate-180" />
        بازگشت به من
      </Link>
      <p className="eyebrow">
        <span className="dot" />
        {eyebrow}
      </p>
      <h1 className="hero-title">
        {title}
        <span className="hero-sub">{subtitle}</span>
      </h1>
    </header>
  );
}
