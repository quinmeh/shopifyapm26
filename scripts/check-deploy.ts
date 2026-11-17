import { Redis } from "@upstash/redis";

async function main() {
  const required = ["APP_URL", "UCP_PROFILE_URL", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "RESEND_API_KEY", "EMAIL_FROM", "CRON_SECRET"];
  const missing = required.filter(key => !process.env[key]?.trim());
  if (missing.length) throw new Error(`Missing production configuration: ${missing.join(", ")}. Set these in Vercel; do not commit secrets.`);
  const url = new URL(process.env.APP_URL!);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash || ["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("APP_URL must be the canonical HTTPS production origin.");
  if (process.env.EMAIL_MODE === "preview") throw new Error("Remove EMAIL_MODE=preview from production configuration.");
  if (process.env.CRON_SECRET!.length < 32) throw new Error("Use at least 32 random characters for CRON_SECRET.");
  await Redis.fromEnv().ping();
  console.log("Production configuration and Redis connection pass. Verify the email sending domain and scheduler in their dashboards; no email was sent.");
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Production check failed."); process.exitCode = 1; });
