"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AdminIcons } from "./AdminIcons";
import { ADMIN_NAV_ITEMS } from "@/lib/admin-nav";

/// شبكة بطاقات "الوصول السريع" لكل أقسام الإدارة في شاشة واحدة، بنفس فكرة
/// لوحة التحكم المرجعية: بطاقة لكل قسم بأيقونة داخل دائرة ملوّنة + عنوان.
/// نستبعد "لوحة التحكم" نفسها من الشبكة لأن المستخدم أصلًا واقف فيها.
export function DashboardHub() {
  const items = ADMIN_NAV_ITEMS.filter((item) => item.href !== "/admin/dashboard");

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((item, i) => {
        const Icon = AdminIcons[item.icon];
        const isAccent = i % 2 === 1;
        return (
          <motion.div
            key={item.href}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              href={item.href}
              className="group relative flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-6 text-center card-hover shadow-elevated overflow-hidden h-full"
            >
              <div
                className="absolute -top-8 -end-8 w-24 h-24 rounded-full opacity-0 group-hover:opacity-[0.1] blur-2xl transition-opacity duration-300"
                style={{ background: isAccent ? "var(--color-accent)" : "var(--color-primary)" }}
              />
              <span
                className={`relative grid place-items-center w-12 h-12 rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-110 ${
                  isAccent ? "bg-accent-soft text-accent" : "bg-primary-soft text-primary"
                }`}
              >
                <Icon className="w-6 h-6" />
              </span>
              <div className="relative">
                <p className="text-sm font-semibold text-ink leading-snug">{item.label}</p>
                <p className="text-xs text-ink-soft mt-1 leading-snug hidden sm:block">{item.description}</p>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
