// يولّد زوج مفاتيح VAPID جديد ومستقل لمنصتك (مرة واحدة بس، مش لازم
// تكرّرها إلا لو غيّرت المفاتيح فعليًا). شغّله بـ:
//   node scripts/generate-vapid-keys.mjs
// وانسخ الناتج لملف .env (أو متغيرات بيئة Vercel).

import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("\nضيف السطور دي في .env (أو Vercel → Settings → Environment Variables):\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${keys.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${keys.privateKey}"`);
console.log("\n⚠️  VAPID_PRIVATE_KEY سرّي - متشاركهوش ومترفعوش على GitHub.\n");
