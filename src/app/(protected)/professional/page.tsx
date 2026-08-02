"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/Navbar";
import { BadgeCheck, Star, ArrowRight, MessageCircle } from "lucide-react";
import Link from "next/link";

interface Professional {
  id: string;
  user_id: string;
  specialty: string | null;
  bio: string | null;
  photo_url: string | null;
  instagram: string | null;
  whatsapp: string | null;
  is_verified: boolean;
  rating: number;
  profiles: { username: string; avatar_url: string | null } | null;
}

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const fetchProfessionals = async () => {
      const { data } = await supabase
        .from("professional_profiles")
        .select(`
          *,
          profiles (username, avatar_url)
        `)
        .eq("is_verified", true)
        .order("rating", { ascending: false });

      if (data) setProfessionals(data);
      setLoading(false);
    };

    fetchProfessionals();
  }, []);

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900">Expertos</h1>
          <p className="text-xs text-gray-500">Psicologos y terapeutas verificados</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : professionals.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-sm">Aun no hay profesionales verificados</p>
            <Link
              href="/professional/register"
              className="inline-block mt-3 text-sm text-rose-600 font-medium"
            >
              Registrar como profesional
            </Link>
          </div>
        ) : (
          professionals.map((pro) => (
            <div key={pro.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <Link
                href={`/professional/${pro.user_id}`}
                className="flex items-center gap-3"
              >
                {pro.photo_url ? (
                  <img
                    src={pro.photo_url}
                    alt={pro.profiles?.username || "Profesional"}
                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-100"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                    {pro.profiles?.username?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {pro.profiles?.username}
                    </p>
                    {pro.is_verified && <BadgeCheck className="w-4 h-4 text-rose-600 shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-500">{pro.specialty || "Psicologo/a"}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs text-gray-600">{pro.rating.toFixed(1)}</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
              </Link>
              {pro.whatsapp && (
                <a
                  href={`https://wa.me/549${pro.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-xl text-xs font-medium hover:bg-green-600 active:scale-[0.98] transition-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MessageCircle className="w-4 h-4" />
                  Contactar por WhatsApp
                </a>
              )}
            </div>
          ))
        )}
      </div>

      <Navbar />
    </div>
  );
}
