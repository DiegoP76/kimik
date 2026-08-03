"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, X } from "lucide-react";
import { cn, formatTimeAgo } from "@/lib/utils";
import Link from "next/link";

interface NewConflict {
  id: string;
  title: string;
  created_at: string;
  profiles: { username: string } | null;
}

interface ConflictRow {
  id: string;
  title: string;
  created_at: string;
  profiles: { username: string }[] | null;
}

export function NotificationBell() {
  const [count, setCount] = useState(0);
  const [newConflicts, setNewConflicts] = useState<NewConflict[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Get user's last_seen_at
      const { data: profile } = await supabase
        .from("profiles")
        .select("last_seen_at")
        .eq("id", user.id)
        .single();

      if (profile) {
        await fetchNewConflicts(profile.last_seen_at);
      }
    };

    const fetchNewConflicts = async (lastSeen: string) => {
      const { data } = await supabase
        .from("conflicts")
        .select("id, title, created_at, profiles (username)")
        .eq("status", "active")
        .gt("created_at", lastSeen)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) {
        const mapped: NewConflict[] = (data as ConflictRow[]).map((row) => ({
          id: row.id,
          title: row.title,
          created_at: row.created_at,
          profiles: row.profiles?.[0] || null,
        }));
        setNewConflicts(mapped);
        setCount(mapped.length);
      }
    };

    init();

    // Listen for new conflicts in real-time
    const channel = supabase
      .channel("notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conflicts" }, async (payload) => {
        // Don't count own conflicts
        if (userId && payload.new.user_id === userId) return;

        setCount((prev) => prev + 1);
        setNewConflicts((prev) => [{
          id: payload.new.id,
          title: payload.new.title,
          created_at: payload.new.created_at,
          profiles: null,
        }, ...prev].slice(0, 10));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const markAsSeen = async () => {
    if (!userId) return;
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", userId);
    setCount(0);
  };

  const handleOpen = () => {
    setShowPanel(true);
    if (count > 0) markAsSeen();
  };

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative p-1.5 rounded-full hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPanel(false)} />
          <div className="relative bg-white rounded-t-2xl w-full max-w-lg shadow-xl overflow-hidden" style={{ marginTop: "120px" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Notificaciones</h3>
              <button
                onClick={() => setShowPanel(false)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "calc(80vh - 180px)" }}>
              {newConflicts.length === 0 ? (
                <div className="text-center py-10">
                  <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Sin notificaciones nuevas</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {newConflicts.map((conflict) => (
                    <Link
                      key={conflict.id}
                      href={`/conflict/${conflict.id}`}
                      onClick={() => setShowPanel(false)}
                      className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{conflict.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Nuevo conflicto · {formatTimeAgo(conflict.created_at)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
