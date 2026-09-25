import { NextResponse, type NextRequest } from "next/server";
import { decrypt, SESSION_COOKIE } from "@/lib/session";

const PROTECTED_PREFIXES = ["/dashboard", "/learn", "/instructor", "/admin"];
const AUTH_PAGES = ["/login", "/register"];

// Optimistic checks only (cookie signature + role claim). Real authorization happens in lib/dal.ts.
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await decrypt(request.cookies.get(SESSION_COOKIE)?.value);

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (isProtected && !session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if (session) {
    if (AUTH_PAGES.includes(pathname)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (pathname.startsWith("/admin") && session.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (pathname.startsWith("/instructor") && session.role === "student") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)"],
};
