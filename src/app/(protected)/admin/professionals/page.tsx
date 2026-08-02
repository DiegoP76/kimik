"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Shield, Check, X, BadgeCheck, Clock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PendingProfessional {
  id: string;
  user_id: string;
  license_number: string;
  specialty: string | null;
  bio: string | null;
  photo_url: string | null;
  is_verified: boolean;
  created_at: string;
  profiles: { username: string; email?: string } | null;
}

export default function AdminProfessionalsPage() {
  const [professionals, setProfessionals] = useState<PendingProfessional[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
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

      await fetchProfessionals();
    };

    const fetchProfessionals = async () => {
      const { data } = await supabase
        .from("professional_profiles")
        .select(`
          *,
          profiles (username)
        `)
        .order("created_at", { ascending: false });

      if (data) setProfessionals(data as PendingProfessional[]);
      setLoading(false);
    };

    checkAdmin();
  }, [router]);

  const handleVerify = async (professionalId: string, userId: string, approve: boolean) => {
    setProcessingId(professionalId);
    const supabase = createClient();

    if (approve) {
      await supabase
        .from("professional_profiles")
        .update({ is_verified: true })
        .eq("id", professionalId);

      await supabase
        .from("profiles")
        .update({ role: "professional" })
        .eq("id", userId);
    } else {
      await supabase
        .from("professional_profiles")
        .delete()
        .eq("id", professionalId);
    }

    setProfessionals((prev) => prev.filter((p) => p.id !== professionalId));
    setProcessingId(null);
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

  const pending = professionals.filter((p) => !p.is_verified);
  const verified = professionals.filter((p) => p.is_verified);

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/admin" className="p-1">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Profesionales</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Pending */}
        <div>
          <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-500" />
            Pendientes ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6 bg-white rounded-2xl border border-gray-100">
              No hay profesionales pendientes
            </p>
          ) : (
            <div className="space-y-3">
              {pending.map((pro) => (
                <div key={pro.id} className="bg-white rounded-2xl border border-orange-200 p-4">
                  <div className="flex items-start gap-3 mb-3">
                    {pro.photo_url ? (
                      <img
                        src={pro.photo_url}
                        alt={pro.profiles?.username || "Profesional"}
                        className="w-14 h-14 rounded-xl object-cover border border-gray-200 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-lg font-bold shrink-0">
                        {pro.profiles?.username?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{pro.profiles?.username}</p>
                          <p className="text-xs text-gray-500">Licencia: {pro.license_number}</p>
                          {pro.specialty && (
                            <p className="text-xs text-gray-500">Especialidad: {pro.specialty}</p>
                          )}
                        </div>
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-medium shrink-0">
                          Pendiente
                        </span>
                      </div>
                    </div>
                  </div>
                  {pro.bio && (
                    <p className="text-xs text-gray-600 mb-3 bg-gray-50 p-2 rounded-lg">{pro.bio}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleVerify(pro.id, pro.user_id, true)}
                      disabled={processingId === pro.id}
                      className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-green-600 text-white rounded-xl text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      Aprobar
                    </button>
                    <button
                      onClick={() => handleVerify(pro.id, pro.user_id, false)}
                      disabled={processingId === pro.id}
                      className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-red-100 text-red-700 rounded-xl text-xs font-medium hover:bg-red-200 disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Verified */}
        <div>
          <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 text-green-500" />
            Verificados ({verified.length})
          </h2>
          {verified.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6 bg-white rounded-2xl border border-gray-100">
              No hay profesionales verificados
            </p>
          ) : (
            <div className="space-y-2">
              {verified.map((pro) => (
                <div key={pro.id} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-3">
                  {pro.photo_url ? (
                    <img
                      src={pro.photo_url}
                      alt={pro.profiles?.username || "Profesional"}
                      className="w-10 h-10 rounded-full object-cover border border-gray-100 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {pro.profiles?.username?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{pro.profiles?.username}</p>
                    <p className="text-xs text-gray-500">{pro.specialty || "Psicologo/a"}</p>
                  </div>
                  <BadgeCheck className="w-4 h-4 text-green-500 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
