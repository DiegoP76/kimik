"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Ban, Clock, LogOut } from "lucide-react";

export default function BlockedPage() {
  const [blockedUntil, setBlockedUntil] = useState<string | null>(null);
  const [isPermanent, setIsPermanent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const checkBlock = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_blocked, blocked_until, blocked_permanently")
        .eq("id", user.id)
        .single();

      if (profile) {
        setIsPermanent(profile.blocked_permanently);
        setBlockedUntil(profile.blocked_until);
      }
      setLoading(false);
    };

    checkBlock();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <Ban className="w-8 h-8 text-red-600" />
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Cuenta bloqueada</h1>
      {isPermanent ? (
        <p className="text-sm text-gray-600 mb-6">
          Tu cuenta ha sido bloqueada permanentemente. Si crees que esto es un error, contacta al administrador.
        </p>
      ) : (
        <p className="text-sm text-gray-600 mb-6">
          Tu cuenta esta bloqueada temporalmente.
          {blockedUntil && (
            <span className="block mt-1 font-medium text-gray-900">
              <Clock className="w-4 h-4 inline mr-1" />
              Se desbloquea el {new Date(blockedUntil).toLocaleDateString("es-AR")} a las {new Date(blockedUntil).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </p>
      )}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl text-sm font-medium"
      >
        <LogOut className="w-4 h-4" />
        Cerrar sesion
      </button>
    </div>
  );
}
