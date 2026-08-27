"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ConflictCard } from "@/components/ConflictCard";
import { Navbar } from "@/components/Navbar";
import { Flame, Clock, TrendingUp, Info, X, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";

type FilterType = "hot" | "new" | "top" | "mine";

export default function FeedPage() {
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterType>("new");
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };

    getUserId();
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const fetchConflicts = async () => {
      setLoading(true);
      let query = supabase
        .from("conflicts")
        .select(`
          *,
          profiles (username, avatar_url),
          votes (selected_option),
          professional_opinions (id)
        `);

      if (filter === "mine") {
        if (!userId) {
          setLoading(false);
          return;
        }
        query = query.eq("user_id", userId);
      } else {
        query = query.eq("status", "active");
      }

      if (filter === "hot") {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        query = query.gte("created_at", sevenDaysAgo.toISOString());
        query = query.order("created_at", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data } = await query.limit(filter === "top" ? 50 : filter === "mine" ? 100 : 20);
      if (data) {
        if (filter === "hot" || filter === "top") {
          data.sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0));
        }
        setConflicts(data);
      }
      setLoading(false);
    };

    fetchConflicts();

    const channel = supabase
      .channel("conflicts-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conflicts" }, () => {
        fetchConflicts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [filter, userId]);

  const filters: { id: FilterType; label: string; icon: typeof Flame }[] = [
    { id: "hot", label: "Popular", icon: Flame },
    { id: "new", label: "Nuevo", icon: Clock },
    { id: "top", label: "Top", icon: TrendingUp },
    { id: "mine", label: "Mios", icon: User },
  ];

  const filterInfo = [
    { label: "Popular", desc: "Lo mas votado de los ultimos 7 dias", icon: Flame },
    { label: "Nuevo", desc: "Los conflictos mas recientes", icon: Clock },
    { label: "Top", desc: "Los mas votados de todos los tiempos", icon: TrendingUp },
    { label: "Mios", desc: "Tus conflictos publicados", icon: User },
  ];

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <img src="/logo.svg" alt="KimiK" className="h-8" />
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={() => setShowInfo(true)}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Info className="w-4.5 h-4.5 text-gray-400" />
            </button>
          </div>
        </div>
        <div className="flex gap-1 px-4 pb-3 overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                filter === f.id
                  ? "bg-rose-600 text-white"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              <f.icon className="w-3.5 h-3.5" />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 mt-3">Cargando conflictos...</p>
          </div>
        ) : conflicts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-sm">
              {filter === "mine" ? "No publicaste ningun conflicto aun" : "No hay conflictos aun"}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              {filter === "mine" ? "Publica tu primer conflicto" : "Sé el primero en publicar"}
            </p>
          </div>
        ) : (
          conflicts.map((conflict) => (
            <ConflictCard key={conflict.id} conflict={conflict} />
          ))
        )}
      </div>

      {/* Info Bottom Sheet */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowInfo(false)} />
          <div className="relative bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Filtros</h3>
              <button
                onClick={() => setShowInfo(false)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              {filterInfo.map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Navbar />
    </div>
  );
}
