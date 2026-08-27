import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|login|register|forgot-password|reset-password|blocked|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
