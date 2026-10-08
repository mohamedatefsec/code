"use client";

import { useCallback, useEffect, useState } from "react";

type LogRow = {
  id: string;
  createdAt: string;
  ip: string;
  result: "success" | "failed" | "blocked" | "disabled";
  userAgent: string | null;
  loginIdentifier: string;
  role: "admin" | "student" | null;
  studentName: string | null;
  studentCode: string;
  ipAccountCount: number;
  accountIpCount: number;
  blocked: boolean;
};

type BlockedIp = { id: string; ip: string; note: string | null; createdAt: string };

const RESULT_LABEL: Record<LogRow["result"], { text: string; cls: string }> = {
  success: { text: "ناجح", cls: "bg-accent/10 text-accent border-accent/40" },
  failed: { text: "كلمة مرور خاطئة", cls: "bg-warn-soft text-warn border-warn/40" },
  blocked: { text: "محظور", cls: "bg-danger/10 text-danger border-danger/40" },
  disabled: { text: "حساب معطّل", cls: "bg-canvas text-ink-soft border-border" },
};

/// وصف مختصر للجهاز/المتصفح من الـ user-agent (كفاية للتمييز بين جهازين).
function describeDevice(ua: string | null): string {
  if (!ua) return "—";
  const os = /Android/i.test(ua)
    ? "Android"
    : /iPhone|iPad|iPod/i.test(ua)
    ? "iOS"
    : /Windows/i.test(ua)
    ? "Windows"
    : /Mac OS X|Macintosh/i.test(ua)
    ? "Mac"
    : /Linux/i.test(ua)
    ? "Linux"
    : "جهاز";
  const browser = /Edg\//i.test(ua)
    ? "Edge"
    : /OPR\/|Opera/i.test(ua)
    ? "Opera"
    : /Firefox/i.test(ua)
    ? "Firefox"
    : /Chrome|CriOS/i.test(ua)
    ? "Chrome"
    : /Safari/i.test(ua)
    ? "Safari"
    : "متصفح";
  return `${browser} · ${os}`;
}

export default function LoginLogsPage() {
  const [logs, setLogs] = useState<LogRow[] | null>(null);
  const [blocked, setBlocked] = useState<BlockedIp[] | null>(null);
  const [q, setQ] = useState("");
  const [result, setResult] = useState("");
  const [busyIp, setBusyIp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (result) params.set("result", result);
    const res = await fetch(`/api/login-logs?${params}`, { cache: "no-store" });
    if (res.ok) setLogs((await res.json()).logs);
    else setError("تعذّر تحميل سجل الدخول (لو لسه ما عملتش db:push للجداول الجديدة، اعمله الأول).");
  }, [q, result]);

  const loadBlocked = useCallback(async () => {
    const res = await fetch("/api/blocked-ips", { cache: "no-store" });
    if (res.ok) setBlocked((await res.json()).blocked);
  }, []);

  useEffect(() => {
    const t = setTimeout(loadLogs, 250); // تأخير بسيط أثناء الكتابة في البحث
    return () => clearTimeout(t);
  }, [loadLogs]);

  useEffect(() => {
    loadBlocked();
  }, [loadBlocked]);

  async function handleBlock(row: LogRow) {
    const who = row.studentName ?? row.loginIdentifier;
    const note = prompt(
      `حظر الـ IP ${row.ip} (آخر دخول: ${who})\n\n` +
        "تنبيه: كل الطلاب اللي على نفس الشبكة (نفس الواي فاي أو نفس شبكة الموبايل) هيتحظروا معاه.\n\n" +
        "سبب الحظر (اختياري):",
      who
    );
    if (note === null) return; // ألغى العملية
    setBusyIp(row.ip);
    setError(null);
    const res = await fetch("/api/blocked-ips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip: row.ip, note: note.trim() || null }),
    });
    setBusyIp(null);
    if (res.ok) {
      await Promise.all([loadLogs(), loadBlocked()]);
    } else {
      const d = await res.json().catch(() => null);
      setError(d?.error ?? "تعذّر حظر الـ IP.");
    }
  }

  async function handleUnblock(id: string, ip: string) {
    if (!confirm(`إلغاء حظر الـ IP ${ip}؟`)) return;
    setBusyIp(ip);
    const res = await fetch(`/api/blocked-ips/${id}`, { method: "DELETE" });
    setBusyIp(null);
    if (res.ok) await Promise.all([loadLogs(), loadBlocked()]);
    else setError("تعذّر إلغاء الحظر.");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-ink">سجل الدخول</h1>
        <p className="text-sm text-ink-soft mt-1">
          كل عملية دخول للمنصة بعنوان الـ IP والجهاز - عشان تكتشف لو طالب شارك حسابه مع طالب تاني،
          وتحظر الـ IP لو لزم.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* ===== الـ IPs المحظورة ===== */}
      <section className="rounded-xl border border-border bg-surface p-5 shadow-elevated space-y-3">
        <h2 className="font-semibold text-ink">
          🚫 عناوين IP المحظورة {blocked ? `(${blocked.length})` : ""}
        </h2>
        {blocked === null ? (
          <p className="text-sm text-ink-soft">جارٍ التحميل...</p>
        ) : blocked.length === 0 ? (
          <p className="text-sm text-ink-soft">مفيش أي IP محظور حاليًا.</p>
        ) : (
          <div className="space-y-2">
            {blocked.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-canvas px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <span className="font-mono text-ink" dir="ltr">
                    {b.ip}
                  </span>
                  <span className="text-xs text-ink-soft ms-3">
                    {b.note ? `${b.note} · ` : ""}
                    {new Date(b.createdAt).toLocaleDateString("ar-EG")}
                  </span>
                </div>
                <button
                  onClick={() => handleUnblock(b.id, b.ip)}
                  disabled={busyIp === b.ip}
                  className="shrink-0 rounded-lg border border-border px-3 py-1 text-xs text-ink-soft hover:bg-border/40 transition disabled:opacity-50"
                >
                  إلغاء الحظر
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== السجل ===== */}
      <section className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم الطالب أو كوده أو الـ IP..."
            className="flex-1 min-w-[220px] rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink"
          />
          <select
            value={result}
            onChange={(e) => setResult(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink"
          >
            <option value="">كل النتائج</option>
            <option value="success">ناجح</option>
            <option value="failed">كلمة مرور خاطئة</option>
            <option value="blocked">محظور</option>
            <option value="disabled">حساب معطّل</option>
          </select>
        </div>

        <div className="rounded-xl border border-border bg-surface shadow-elevated overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-canvas text-ink-soft">
              <tr>
                <th className="text-start px-3 py-3 font-medium">الوقت</th>
                <th className="text-start px-3 py-3 font-medium">الطالب</th>
                <th className="text-start px-3 py-3 font-medium">IP</th>
                <th className="text-start px-3 py-3 font-medium">الجهاز</th>
                <th className="text-start px-3 py-3 font-medium">النتيجة</th>
                <th className="text-start px-3 py-3 font-medium">تنبيه</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {logs === null && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-ink-soft">
                    جارٍ التحميل...
                  </td>
                </tr>
              )}
              {logs?.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-ink-soft">
                    لا توجد عمليات دخول مسجّلة.
                  </td>
                </tr>
              )}
              {logs?.map((l) => {
                const r = RESULT_LABEL[l.result];
                const sharedIp = l.ipAccountCount > 1;
                const multiIp = l.accountIpCount > 1;
                return (
                  <tr key={l.id} className="border-t border-border align-top">
                    <td className="px-3 py-3 text-ink-soft whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString("ar-EG", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-ink">
                        {l.studentName ?? (l.role === "admin" ? "أدمن" : "—")}
                      </p>
                      <p className="font-mono text-xs text-ink-soft">{l.studentCode}</p>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-ink whitespace-nowrap" dir="ltr">
                      {l.ip}
                    </td>
                    <td className="px-3 py-3 text-xs text-ink-soft whitespace-nowrap">
                      {describeDevice(l.userAgent)}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${r.cls}`}>{r.text}</span>
                    </td>
                    <td className="px-3 py-3 space-y-1 text-[11px]">
                      {sharedIp && (
                        <p className="text-warn">⚠️ {l.ipAccountCount} حسابات دخلت من نفس الـ IP</p>
                      )}
                      {multiIp && (
                        <p className="text-warn">⚠️ نفس الحساب دخل من {l.accountIpCount} IPs مختلفة</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-end whitespace-nowrap">
                      {l.role === "admin" ? null : l.blocked ? (
                        <span className="text-xs text-danger">🚫 محظور</span>
                      ) : (
                        <button
                          onClick={() => handleBlock(l)}
                          disabled={busyIp === l.ip || l.ip === "unknown"}
                          className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-1 text-xs font-medium text-danger hover:opacity-80 transition disabled:opacity-50"
                        >
                          حظر الـ IP
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-ink-soft">
          بيظهر آخر 300 عملية. السجلات بتتحذف تلقائيًا بعد 90 يوم.
        </p>
      </section>
    </div>
  );
}
