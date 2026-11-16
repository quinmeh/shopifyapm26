import { storageMode } from "@/lib/store";

export const dynamic = "force-dynamic";

// Deploy smoke test: confirms the server runs, which store it's using, and that
// the UCP profile URL is configured.
export async function GET() {
  return Response.json({
    ok: true,
    storage: storageMode(),
    ucpProfileConfigured: Boolean(process.env.UCP_PROFILE_URL),
    time: new Date().toISOString(),
  });
}
