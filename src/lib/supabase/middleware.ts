import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const protectedPaths = ["/feed", "/create", "/profile", "/professional", "/admin"];
  const pathname = request.nextUrl.pathname;
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Check if user is blocked
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_blocked, blocked_until, blocked_permanently")
      .eq("id", user.id)
      .single();

    if (profile) {
      // Permanent block
      if (profile.blocked_permanently) {
        const url = request.nextUrl.clone();
        url.pathname = "/blocked";
        return NextResponse.redirect(url);
      }

      // Temporary block - check if expired
      if (profile.is_blocked && profile.blocked_until) {
        const blockedUntil = new Date(profile.blocked_until);
        if (blockedUntil > new Date()) {
          // Still blocked
          const url = request.nextUrl.clone();
          url.pathname = "/blocked";
          return NextResponse.redirect(url);
        } else {
          // Block expired, auto-unblock
          await supabase
            .from("profiles")
            .update({ is_blocked: false, blocked_until: null })
            .eq("id", user.id);
        }
      }
    }
  }

  return supabaseResponse;
}
