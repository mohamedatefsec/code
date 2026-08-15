import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "code_ai_session";

function getSecretKey() {
  return new TextEncoder().encode(process.env.JWT_SECRET);
}

async function readSession(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.role === "admin" || payload.role === "student") {
      return { userId: payload.userId as string, role: payload.role as "admin" | "student" };
    }
    return null;
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await readSession(req);

  const isAdminArea = pathname.startsWith("/admin");
  const isStudentArea = pathname.startsWith("/dashboard") || pathname.startsWith("/lessons") || pathname.startsWith("/quizzes") || pathname.startsWith("/results") || pathname.startsWith("/profile");

  // منطقة الأدمن: تتطلب دور admin
  if (isAdminArea) {
    if (!session || session.role !== "admin") {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // منطقة الطالب: تتطلب دور student
  if (isStudentArea) {
    if (!session || session.role !== "student") {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // مستخدم مسجّل دخوله بالفعل يحاول فتح صفحة تسجيل الدخول → حوّله للوحته
  if (pathname === "/login" && session) {
    const target = session.role === "admin" ? "/admin/dashboard" : "/dashboard";
    return NextResponse.redirect(new URL(target, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/lessons/:path*",
    "/quizzes/:path*",
    "/results/:path*",
    "/profile/:path*",
    "/login",
  ],
};
