"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/Navbar";
import { LogOut, ChevronRight, Award, Shield, Bell, BellOff } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  role: string;
  push_notifications_enabled: boolean;
  created_at: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({ conflicts: 0, votes: 0 });
  const [loading, setLoading] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setPushEnabled(profileData.push_notifications_enabled || false);
      }

      const { count: conflictsCount } = await supabase
        .from("conflicts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { count: votesCount } = await supabase
        .from("votes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      setStats({
        conflicts: conflictsCount || 0,
        votes: votesCount || 0,
      });
      setLoading(false);
    };

    fetchProfile();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const togglePushNotifications = async () => {
    if (!profile) return;
    setPushLoading(true);

    const supabase = createClient();

    if (!pushEnabled) {
      // Enable push notifications
      if ("Notification" in window && "serviceWorker" in navigator) {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          const registration = await navigator.serviceWorker.ready;
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;

          if (vapidKey) {
            try {
              const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: vapidKey,
              });

              const sub = subscription.toJSON();
              await supabase.from("push_subscriptions").upsert({
                user_id: user.id,
                endpoint: sub.endpoint!,
                p256dh: sub.keys!.p256dh,
                auth: sub.keys!.auth,
              });
            } catch {
              // VAPID key not configured, skip push subscription
            }
          }

          await supabase
            .from("profiles")
            .update({ push_notifications_enabled: true })
            .eq("id", user.id);

          setPushEnabled(true);
        }
      }
    } else {
      // Disable push notifications
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id);

      await supabase
        .from("profiles")
        .update({ push_notifications_enabled: false })
        .eq("id", user.id);

      setPushEnabled(false);
    }

    setPushLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900">Mi perfil</h1>
        </div>
      </div>

      {/* Profile Card */}
      <div className="p-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
            {profile?.username?.[0]?.toUpperCase() || "?"}
          </div>
          <h2 className="text-lg font-bold text-gray-900">{profile?.username}</h2>
          <p className="text-sm text-gray-500 capitalize">{profile?.role || "user"}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-rose-600">{stats.conflicts}</p>
            <p className="text-xs text-gray-500 mt-1">Conflictos</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.votes}</p>
            <p className="text-xs text-gray-500 mt-1">Votos</p>
          </div>
        </div>

        {/* Menu */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {profile?.role === "admin" && (
            <Link
              href="/admin"
              className="flex items-center justify-between p-4 border-b border-gray-50 bg-rose-50"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-rose-600" />
                <span className="text-sm font-medium text-rose-700">Admin Panel</span>
              </div>
              <ChevronRight className="w-4 h-4 text-rose-400" />
            </Link>
          )}
          <Link
            href="/professional/register"
            className="flex items-center justify-between p-4 border-b border-gray-50"
          >
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-rose-600" />
              <span className="text-sm font-medium text-gray-900">Ser profesional</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>

          {/* Push Notifications Toggle */}
          <button
            onClick={togglePushNotifications}
            disabled={pushLoading}
            className="flex items-center justify-between w-full p-4 border-b border-gray-50"
          >
            <div className="flex items-center gap-3">
              {pushEnabled ? (
                <Bell className="w-5 h-5 text-green-600" />
              ) : (
                <BellOff className="w-5 h-5 text-gray-400" />
              )}
              <div className="text-left">
                <span className="text-sm font-medium text-gray-900 block">Notificaciones push</span>
                <span className="text-xs text-gray-500">
                  {pushEnabled ? "Activadas" : "Desactivadas"}
                </span>
              </div>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors ${pushEnabled ? "bg-green-500" : "bg-gray-300"}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform mt-0.5 ${pushEnabled ? "translate-x-5.5 ml-0.5" : "translate-x-0.5"}`} />
            </div>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full p-4 text-left"
          >
            <LogOut className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-900">Cerrar sesion</span>
          </button>
        </div>
      </div>

      <Navbar />
    </div>
  );
}
