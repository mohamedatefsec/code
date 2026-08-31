"use client";

import { useEffect, useState, FormEvent } from "react";

type Payment = {
  id: string;
  amount: number;
  paidAt: string;
  note: string | null;
};

function todayInputValue() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function PaymentModal({
  studentId,
  studentName,
  onClose,
  onChanged,
}: {
  studentId: string;
  studentName: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [paidAt, setPaidAt] = useState(todayInputValue());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function load() {
    setError(null);
    fetch(`/api/payments?studentId=${studentId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("تعذّر تحميل سجل الدفعات.");
        return r.json();
      })
      .then((d) => setPayments(d.payments))
      .catch((err: Error) => setError(err.message));
  }

  useEffect(load, [studentId]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      setError("أدخل مبلغًا صحيحًا أكبر من صفر.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        amount: amountNum,
        note: note || null,
        paidAt: new Date(paidAt).toISOString(),
      }),
    });
    setSaving(false);
    if (res.ok) {
      setAmount("");
      setNote("");
      setPaidAt(todayInputValue());
      load();
      onChanged();
    } else {
      const d = await res.json().catch(() => null);
      setError(d?.error ?? "تعذّر تسجيل الدفعة.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("هل تريد حذف هذه الدفعة من السجل؟")) return;
    setDeletingId(id);
    const res = await fetch(`/api/payments/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) {
      load();
      onChanged();
    } else {
      const d = await res.json().catch(() => null);
      setError(d?.error ?? "تعذّر حذف الدفعة.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-surface p-5 shadow-elevated max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-ink">سجل اشتراك {studentName}</h2>
          <button onClick={onClose} className="text-ink-soft hover:text-ink text-xl leading-none">
            ×
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleAdd} className="space-y-3 mb-5 rounded-lg border border-border p-3">
          <p className="text-xs font-medium text-ink-soft">تسجيل دفعة جديدة</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-ink-soft mb-1">المبلغ</label>
              <input
                type="number"
                min={0}
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="مثال: 200"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-ink-soft mb-1">التاريخ</label>
              <input
                type="date"
                required
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-ink-soft mb-1">ملاحظة (اختياري)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثال: اشتراك شهر أكتوبر"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-60"
          >
            {saving ? "جارٍ الحفظ..." : "تسجيل الدفعة"}
          </button>
        </form>

        <p className="text-xs font-medium text-ink-soft mb-2">السجل</p>
        {payments === null && !error && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}
        {payments?.length === 0 && <p className="text-sm text-ink-soft">لا توجد دفعات مسجّلة لهذا الطالب بعد.</p>}
        <div className="space-y-2">
          {payments?.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
            >
              <div>
                <p className="stat-figure font-semibold text-ink">{p.amount} جنيه</p>
                <p className="text-xs text-ink-soft">
                  {new Date(p.paidAt).toLocaleDateString("ar-EG")}
                  {p.note && ` · ${p.note}`}
                </p>
              </div>
              <button
                onClick={() => handleDelete(p.id)}
                disabled={deletingId === p.id}
                className="text-xs text-danger hover:underline disabled:opacity-50"
              >
                {deletingId === p.id ? "جارٍ الحذف..." : "حذف"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
