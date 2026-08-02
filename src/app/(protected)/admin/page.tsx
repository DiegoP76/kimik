"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, Users, AlertTriangle, BarChart3 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Stats {
  totalUsers: number;
  totalConflicts: number;
  totalVotes: number;
  pendingProfessionals: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalConflicts: 0,
    totalVotes: 0,
    pendingProfessionals: 0,
  });
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const checkAdminAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

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

      const [usersCount, conflictsCount, votesCount, pendingCount] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("conflicts").select("*", { count: "exact", head: true }),
        supabase.from("votes").select("*", { count: "exact", head: true }),
        supabase.from("professional_profiles").select("*", { count: "exact", head: true }).eq("is_verified", false),
      ]);

      setStats({
        totalUsers: usersCount.count || 0,
        totalConflicts: conflictsCount.count || 0,
        totalVotes: votesCount.count || 0,
        pendingProfessionals: pendingCount.count || 0,
      });
      setLoading(false);
    };

    checkAdminAndFetch();
  }, [router]);

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
        <p className="text-sm text-gray-500 text-center mb-6">
          No tenes permisos de administrador
        </p>
        <Link
          href="/feed"
          className="px-6 py-3 bg-rose-600 text-white rounded-xl text-sm font-medium"
        >
          Volver al feed
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-rose-600" />
            <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <Users className="w-5 h-5 text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            <p className="text-xs text-gray-500">Usuarios</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <BarChart3 className="w-5 h-5 text-green-500 mb-2" />
            <p className="text-2xl font-bold text-gray-900">{stats.totalConflicts}</p>
            <p className="text-xs text-gray-500">Conflictos</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <BarChart3 className="w-5 h-5 text-purple-500 mb-2" />
            <p className="text-2xl font-bold text-gray-900">{stats.totalVotes}</p>
            <p className="text-xs text-gray-500">Votos totales</p>
          </div>
          <div className={cn(
            "bg-white rounded-2xl border p-4",
            stats.pendingProfessionals > 0 ? "border-orange-200 bg-orange-50" : "border-gray-100"
          )}>
            <AlertTriangle className={cn("w-5 h-5 mb-2", stats.pendingProfessionals > 0 ? "text-orange-500" : "text-gray-400")} />
            <p className="text-2xl font-bold text-gray-900">{stats.pendingProfessionals}</p>
            <p className="text-xs text-gray-500">Pendientes</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-900">Acciones rapidas</h2>

          <Link
            href="/admin/professionals"
            className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-4"
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                stats.pendingProfessionals > 0 ? "bg-orange-100" : "bg-gray-100"
              )}>
                <Shield className={cn("w-5 h-5", stats.pendingProfessionals > 0 ? "text-orange-600" : "text-gray-500")} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Profesionales</p>
                <p className="text-xs text-gray-500">
                  {stats.pendingProfessionals > 0
                    ? `${stats.pendingProfessionals} pendiente${stats.pendingProfessionals > 1 ? "s" : ""} de verificar`
                    : "Todos verificados"}
                </p>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </Link>

          <Link
            href="/admin/conflicts"
            className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Conflictos</p>
                <p className="text-xs text-gray-500">Gestionar publicaciones</p>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
