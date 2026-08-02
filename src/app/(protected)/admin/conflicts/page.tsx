"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Shield, AlertTriangle, Trash2, Eye } from "lucide-react";
import Link from "next/link";
import { cn, formatTimeAgo } from "@/lib/utils";

interface Conflict {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  profiles: { username: string } | null;
  votes: { id: string }[];
}

export default function AdminConflictsPage() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        setUnauthorized(true);
        setLoading(false);
        return;
      }

      await fetchConflicts();
    };

    const fetchConflicts = async () => {
      const { data } = await supabase
        .from("conflicts")
        .select(`
          *,
          profiles (username),
          votes (id)
        `)
        .order("created_at", { ascending: false });

      if (data) setConflicts(data);
      setLoading(false);
    };

    checkAdmin();
  }, [router]);

  const handleStatusChange = async (conflictId: string, newStatus: string) => {
    const supabase = createClient();
    await supabase
      .from("conflicts")
      .update({ status: newStatus })
      .eq("id", conflictId);

    setConflicts((prev) =>
      prev.map((c) => (c.id === conflictId ? { ...c, status: newStatus } : c))
    );
  };

  const handleDelete = async (conflictId: string) => {
    if (!confirm("Eliminar este conflicto?")) return;
    const supabase = createClient();
    await supabase.from("conflicts").delete().eq("id", conflictId);
    setConflicts((prev) => prev.filter((c) => c.id !== conflictId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6">
        <Shield className="w-16 h-16 text-gray-300 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Acceso restringido</h1>
        <Link href="/feed" className="px-6 py-3 bg-rose-600 text-white rounded-xl text-sm font-medium">
          Volver al feed
        </Link>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    resolved: "bg-blue-100 text-blue-700",
    flagged: "bg-red-100 text-red-700",
  };

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/admin" className="p-1">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Conflictos</h1>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {conflicts.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-10">No hay conflictos</p>
        ) : (
          conflicts.map((conflict) => (
            <div key={conflict.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{conflict.title}</p>
                  <p className="text-xs text-gray-500">
                    @{conflict.profiles?.username} · {formatTimeAgo(conflict.created_at)} · {conflict.votes.length} votos
                  </p>
                </div>
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ml-2", statusColors[conflict.status] || statusColors.active)}>
                  {conflict.status}
                </span>
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/conflict/${conflict.id}`}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver
                </Link>
                {conflict.status === "active" && (
                  <button
                    onClick={() => handleStatusChange(conflict.id, "flagged")}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-orange-100 text-orange-700 rounded-xl text-xs font-medium"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Flag
                  </button>
                )}
                {conflict.status === "flagged" && (
                  <button
                    onClick={() => handleStatusChange(conflict.id, "active")}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-100 text-green-700 rounded-xl text-xs font-medium"
                  >
                    Activar
                  </button>
                )}
                <button
                  onClick={() => handleDelete(conflict.id)}
                  className="flex items-center justify-center gap-1 py-2 px-3 bg-red-100 text-red-700 rounded-xl text-xs font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
