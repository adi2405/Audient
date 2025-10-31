import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function POST() {
  const BASE_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
  const BASE_OUTPUT_DIR = path.join(process.cwd(), "public", "output");
  try {
    for (const dir of [BASE_UPLOAD_DIR, BASE_OUTPUT_DIR]) {
      await fs.rm(dir, { recursive: true, force: true });
      await fs.mkdir(dir, { recursive: true });
    }
    return new Response(
      JSON.stringify({ status: "clean", message: "All files cleaned up" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: `Cleanup failed: ${e?.message || e}` }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      }
    );
  }
}
