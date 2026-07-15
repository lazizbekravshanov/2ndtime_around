import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { uploadService } from "@/lib/uploads";
import { limitUpload, apiRateLimitResponse } from "@/lib/rateLimit";

// Photo upload endpoint — auth required, file type/size enforced by the
// upload service. Returns { url } for the wizard to attach to the listing.
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  // Throttle per user before the (expensive) blob write. Fails closed.
  const rl = await limitUpload(user.id);
  if (!rl.allowed) {
    return apiRateLimitResponse(rl, {
      error: "Upload limit reached. Try again later.",
    });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  try {
    const url = await uploadService.save(file);
    return NextResponse.json({ url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Upload failed. Try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
