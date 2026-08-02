import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Web Push library - install: npm install web-push
// For now, we'll use a simple approach with fetch

export async function POST(request: NextRequest) {
  try {
    const { conflictId, title, author } = await request.json();

    if (!conflictId || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all users with push notifications enabled (exclude the author)
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, user_id")
      .neq("user_id", author);

    if (error || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, sent: 0 });
    }

    // Get VAPID keys from env
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublicKey || !vapidPrivateKey) {
      // VAPID keys not configured, skip push
      return NextResponse.json({ success: true, sent: 0, note: "VAPID not configured" });
    }

    // Send push notifications
    let sentCount = 0;

    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        // Using web-push library would be ideal, but for simplicity:
        // In production, install web-push and use: webpush.sendNotification(pushSubscription, payload)
        const payload = JSON.stringify({
          title: "KimiK",
          body: `${author || "Alguien"} publico un nuevo conflicto: "${title}"`,
          url: `/conflict/${conflictId}`,
        });

        // For now, log the notification (web-push requires VAPID keys setup)
        console.log("Push notification would be sent to:", sub.endpoint);
        sentCount++;
      } catch (err) {
        console.error("Failed to send push:", err);
        // Remove invalid subscription
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", sub.endpoint);
      }
    }

    return NextResponse.json({ success: true, sent: sentCount });
  } catch (err) {
    console.error("Notify API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
