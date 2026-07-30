export function GET() {
  return Response.json(
    { status: "ok", service: "fruition-site" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
