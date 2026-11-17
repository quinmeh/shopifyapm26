import { storageMode } from "@/lib/store";

export const dynamic = "force-dynamic";

// Deploy smoke test: confirms the server runs, which store it's using, and that
// the UCP profile URL is configured.
export async function GET() {
  const storage = storageMode();
  const productionReady = storage === "upstash" && Boolean(process.env.UCP_PROFILE_URL) && Boolean(process.env.APP_URL?.startsWith("https://")) && Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.CRON_SECRET);
  const ok = process.env.NODE_ENV !== "production" || productionReady;
  return Response.json({
    ok,
    storage,
    productionReady,
    emailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
    ucpProfileConfigured: Boolean(process.env.UCP_PROFILE_URL),
    time: new Date().toISOString(),
  }, { status: ok ? 200 : 503 });
}
