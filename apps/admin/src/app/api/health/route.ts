export function GET() {
  return Response.json(
    { status: "ok", service: "fruition-admin" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
