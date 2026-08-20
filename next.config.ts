import type { NextConfig } from "next";

function getSupabaseHost(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url) {
    try {
      return new URL(url).host;
    } catch {
      // fall through to wildcard fallback
    }
  }
  return "*.supabase.co";
}

function buildContentSecurityPolicy(supabaseHost: string): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' https://${supabaseHost} wss://${supabaseHost}`,
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

function getProductionSecurityHeaders() {
  if (process.env.NODE_ENV !== "production") {
    return [];
  }

  const supabaseHost = getSupabaseHost();

  return [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(supabaseHost),
    },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=()",
    },
  ];
}

const nextConfig: NextConfig = {
  async headers() {
    const securityHeaders = getProductionSecurityHeaders();
    if (securityHeaders.length === 0) {
      return [];
    }

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
