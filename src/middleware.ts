import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js middleware for security headers and basic protections.
 * Runs on every request in the edge runtime.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  // ─── Skip strict CSP for Twilio webhook endpoints ─────────────────────────
  const isTwilioWebhook = pathname.startsWith("/api/whatsapp/webhook") ||
    pathname.startsWith("/api/whatsapp/status");

  // ─── Security headers ─────────────────────────────────────────────────────
  response.headers.set("X-DNS-Prefetch-Control", "on");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  // Content Security Policy - restrict sources
  // Allow Twilio API and Ollama endpoint in connect-src
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://api.twilio.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    isTwilioWebhook ? "form-action *" : "form-action 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  // ─── Block suspicious paths ──────────────────────────────────────────────
  const blockedPaths = [
    "/wp-admin",
    "/wp-login",
    "/xmlrpc.php",
    "/.env",
    "/.git",
    "/config",
    "/admin",
    "/phpmyadmin",
  ];

  if (blockedPaths.some((p) => pathname.toLowerCase().startsWith(p))) {
    return new NextResponse(null, { status: 404 });
  }

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
