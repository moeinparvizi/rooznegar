"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/components/auth/AuthContext";
import { createAccountData } from "@/lib/account";
import { asset } from "@/lib/site";
import { removeUserData, setStorageNamespace } from "@/lib/storage";
import { useAppStore } from "@/lib/store";
import { useUIStore } from "@/lib/ui-store";

const AVATARS = ["🌱", "☕️", "📚", "🏋️", "✂️", "💻", "🎯", "🌿"];

export function AccountCard() {
  const { user, client } = useAuth();
  const profile = useAppStore((state) => state.profile);
  const saveProfile = useAppStore((state) => state.saveProfile);
  const showToast = useUIStore((state) => state.showToast);
  const [confirmErase, setConfirmErase] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);
  const [draftAvatar, setDraftAvatar] = useState(profile.avatarEmoji || AVATARS[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const startEdit = () => {
    setDraftName(profile.name);
    setDraftAvatar(profile.avatarEmoji || AVATARS[0]);
    setError(null);
    setEditing(true);
  };

  const saveEdit = () => {
    const clean = draftName.trim();
    if (!clean) {
      setError("یک نام یا لقب برای باغت بنویس.");
      return;
    }
    saveProfile({ name: clean, avatarEmoji: draftAvatar });
    setEditing(false);
    setError(null);
    showToast("نام و آواتار به‌روز شد.");
  };

  const leave = () => {
    setStorageNamespace(null);
    useAppStore.setState(createAccountData());
    window.location.assign(asset("/"));
  };

  const signOut = async () => {
    setBusy(true);
    try {
      await client.signOut();
    } finally {
      leave();
    }
  };

  const erase = async () => {
    setBusy(true);
    try {
      await removeUserData(user.id);
      await client.signOut();
    } finally {
      leave();
    }
  };

  return (
    <section
      className="surface account-card mt-6 p-5 sm:p-6"
      aria-labelledby="account-heading"
    >
      <div className="flex items-start gap-4">
        <span className="account-avatar" aria-hidden>
          {profile.avatarEmoji || "🌱"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">
            <Icon name="user" size={13} />
            حساب شخصی
          </p>
          <h2 id="account-heading" className="mt-1 truncate text-[18px] font-bold">
            {profile.name.trim() || "حساب روزنگار"}
          </h2>
          <p className="account-email mt-1" dir="ltr">
            {user.email}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="chip" data-active="true">
            <Icon name="check" size={12} />
            واردشده
          </span>
          <button
            type="button"
            className="icon-btn"
            onClick={startEdit}
            aria-label="ویرایش نام و آواتار"
            title="ویرایش نام و آواتار"
          >
            <Icon name="pen" size={15} />
          </button>
        </div>
      </div>

      <p className="mt-4 text-[11.5px] leading-6 text-muted">
        داده‌ی این حساب روی همین دستگاه می‌ماند تا آفلاین هم باز شود. نام و
        آواتار را همین‌جا می‌توانی عوض کنی.
      </p>

      {editing && (
        <div className="account-edit mt-4">
          <label className="auth-field">
            <span className="field-label">نام یا لقب</span>
            <span className="auth-input">
              <Icon name="user" size={16} />
              <input
                value={draftName}
                onChange={(event) => {
                  setDraftName(event.target.value);
                  setError(null);
                }}
                maxLength={24}
                autoFocus
              />
            </span>
          </label>
          <div className="mt-4">
            <p className="field-label">آواتار</p>
            <div className="avatar-grid mt-2" role="group" aria-label="انتخاب آواتار">
              {AVATARS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="avatar-choice"
                  data-active={draftAvatar === item}
                  aria-pressed={draftAvatar === item}
                  aria-label={`آواتار ${item}`}
                  onClick={() => setDraftAvatar(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
            <button type="button" className="btn btn-primary btn-sm" onClick={saveEdit}>
              ذخیره
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
            >
              انصراف
            </button>
          </div>
        </div>
      )}

      <div className="account-actions mt-4">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => void signOut()}
          disabled={busy}
        >
          <Icon name="logout" size={15} />
          خروج
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm account-danger"
          onClick={() => setConfirmErase(true)}
          disabled={busy}
        >
          <Icon name="trash" size={15} />
          خروج و پاک‌کردن این دستگاه
        </button>
      </div>

      {confirmErase && (
        <div
          className="reset-confirm mt-4"
          role="alertdialog"
          aria-labelledby="erase-title"
        >
          <div>
            <p id="erase-title" className="text-[12px] font-bold">
              داده‌های این حساب روی این دستگاه پاک شوند؟
            </p>
            <p className="mt-1 text-[10.5px] leading-6 text-muted">
              حساب در سرویس ورود می‌ماند، اما روزها، تنظیم‌ها و بازبینی‌های
              همین دستگاه حذف می‌شوند. اگر نسخه‌ی پشتیبان نداری، اول بگیر.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => void erase()}
              disabled={busy}
            >
              بله، خارج شو و پاک کن
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => setConfirmErase(false)}
              disabled={busy}
            >
              نه، بماند
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
