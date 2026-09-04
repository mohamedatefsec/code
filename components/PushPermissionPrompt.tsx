"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "code-ai-push-dismissed-at";
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // أسبوع - لو رفض/أجّل، منزعجوش تاني قبل ما يعدّي

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-expect-error خاصية خاصة بسفاري على آيفون/آيباد بس
    window.navigator.standalone === true
  );
}

type BannerState = "hidden" | "ready-to-enable" | "ios-needs-install" | "enabling" | "enabled" | "unsupported";

export function PushPermissionPrompt() {
  const [state, setState] = useState<BannerState>("hidden");

  useEffect(() => {
    const supported =
      typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

    if (!supported) {
      // على آيفون/آيباد من غير تثبيت، مفيش دعم Push خالص - لو مش مثبّتة
      // نقترح التثبيت بدل ما نصمت أو نطلب إذن مش هيشتغل أصلًا.
      if (isIos() && !isStandalone()) {
        const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
        if (Date.now() - dismissedAt > DISMISS_COOLDOWN_MS) setState("ios-needs-install");
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {});

    if (Notification.permission === "granted") {
      // مسجّل بالفعل من قبل - نتأكد بس إن الاشتراك موجود في السيرفر (مثلًا
      // لو الطالب مسح بيانات المتصفح، ده هيسجّله تاني بهدوء من غير ما يشوف
      // أي بانر).
      void ensureSubscribed();
      return;
    }
    if (Notification.permission === "denied") return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() - dismissedAt > DISMISS_COOLDOWN_MS) {
      setState("ready-to-enable");
    }
  }, []);

  async function ensureSubscribed() {
    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!publicKey) return;
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: subscription.toJSON().keys,
          userAgent: navigator.userAgent.slice(0, 300),
        }),
      });
    } catch {
      // فشل صامت - المنصة تفضل شغالة عادي من غير إشعارات
    }
  }

  async function handleEnable() {
    setState("enabling");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("hidden");
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        return;
      }
      await ensureSubscribed();
      setState("enabled");
      setTimeout(() => setState("hidden"), 2500);
    } catch {
      setState("hidden");
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setState("hidden");
  }

  if (state === "hidden" || state === "unsupported") return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:end-4 sm:bottom-4 sm:max-w-sm">
      <div className="rounded-2xl border border-border bg-surface shadow-lg p-4 flex items-start gap-3">
        <span
          className="grid place-items-center w-9 h-9 rounded-xl shrink-0 text-white"
          style={{ background: "var(--gradient-brand)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
            <path
              d="M6 8a6 6 0 1 1 12 0c0 3.6 1 5.4 1.6 6.2.3.4 0 1-.5 1H4.9c-.5 0-.8-.6-.5-1C5 13.4 6 11.6 6 8Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M9.5 18a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          {state === "ready-to-enable" && (
            <>
              <p className="font-bold text-ink text-sm">فعّل إشعارات الدروس والاختبارات</p>
              <p className="text-xs text-ink-soft mt-0.5">
                هتوصلك إشعارات لحظة نشر أي درس أو اختبار جديد، حتى لو المنصة مقفولة.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleEnable}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  تفعيل الإشعارات
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-ink-soft hover:bg-canvas"
                >
                  ليس الآن
                </button>
              </div>
            </>
          )}
          {state === "enabling" && (
            <p className="text-sm text-ink-soft">جاري التفعيل...</p>
          )}
          {state === "enabled" && (
            <p className="text-sm font-bold text-ink">✅ تم تفعيل الإشعارات بنجاح</p>
          )}
          {state === "ios-needs-install" && (
            <>
              <p className="font-bold text-ink text-sm">ثبّت المنصة عشان تفعّل الإشعارات</p>
              <p className="text-xs text-ink-soft mt-0.5">
                على آيفون/آيباد: اضغط زر المشاركة{" "}
                <span aria-hidden>⬆️</span> في Safari، ثم &quot;إضافة إلى الشاشة الرئيسية&quot;.
                بعدها افتح المنصة من الأيقونة الجديدة عشان تقدر تفعّل الإشعارات.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-ink-soft hover:bg-canvas"
                >
                  فهمت
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
