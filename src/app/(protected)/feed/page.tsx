"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ConflictCard } from "@/components/ConflictCard";
import { Navbar } from "@/components/Navbar";
import { Flame, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type FilterType = "hot" | "new" | "top";

export default function FeedPage() {
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterType>("hot");
  const [loading, setLoading] = useState(true);

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
        `)
        .eq("status", "active");

      if (filter === "new") {
        query = query.order("created_at", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data } = await query.limit(20);
      if (data) {
        if (filter === "hot") {
          data.sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0));
        } else if (filter === "top") {
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
  }, [filter]);

  const filters: { id: FilterType; label: string; icon: typeof Flame }[] = [
    { id: "hot", label: "Popular", icon: Flame },
    { id: "new", label: "Nuevo", icon: Clock },
    { id: "top", label: "Top", icon: TrendingUp },
  ];

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900">KimiK</h1>
        </div>
        <div className="flex gap-1 px-4 pb-3">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
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
            <p className="text-gray-500 text-sm">No hay conflictos aun</p>
            <p className="text-gray-400 text-xs mt-1">Sé el primero en publicar</p>
          </div>
        ) : (
          conflicts.map((conflict) => (
            <ConflictCard key={conflict.id} conflict={conflict} />
          ))
        )}
      </div>

      <Navbar />
    </div>
  );
}
