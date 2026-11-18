import { NextResponse, type NextRequest } from "next/server";

// Vercel serves each production deployment on several hostnames, but origin
// checks and emailed links are pinned to APP_URL. Send page visits on any other
// production hostname to APP_URL so forms post from the accepted origin.
// API routes are left alone; they keep enforcing the origin check themselves.
export function proxy(request: NextRequest) {
  if (process.env.VERCEL_ENV !== "production" || !process.env.APP_URL) return NextResponse.next();
  const canonical = new URL(process.env.APP_URL);
  if (request.nextUrl.host === canonical.host) return NextResponse.next();
  const target = new URL(request.nextUrl.pathname + request.nextUrl.search, canonical);
  return NextResponse.redirect(target, 308);
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico).*)"],
};
