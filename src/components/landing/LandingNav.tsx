"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthContext";
import { BrandMark, BrandWord } from "@/components/Brand";

export function LandingNav() {
  const { status, user } = useAuth();
  return (
    <header className="landing-nav">
      <Link href="/" className="flex items-center gap-2" aria-label="روزنگار">
        <span style={{ color: "var(--green)" }}>
          <BrandMark size={26} />
        </span>
        <BrandWord compact />
      </Link>
      <nav className="landing-nav-links" aria-label="بخش‌های معرفی">
        <a href="#features">امکانات</a>
        <a href="#professions">برای هر حرفه</a>
        <a href="#themes">تم‌ها</a>
        <a href="#privacy">حریم خصوصی</a>
      </nav>
      <div className="flex items-center gap-2">
        {status === "signedIn" && user ? (
          <Link href="/today/" className="btn btn-primary btn-sm">
            ادامه به امروز
          </Link>
        ) : (
          <>
            <Link href="/auth/" className="btn btn-ghost btn-sm">
              ورود
            </Link>
            <Link href="/auth/?mode=signup" className="btn btn-primary btn-sm">
              شروع رایگان
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
