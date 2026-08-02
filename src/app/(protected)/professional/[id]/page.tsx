"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BadgeCheck, Star, MessageCircle } from "lucide-react";
import { AudioPlayer } from "@/components/AudioPlayer";

interface ProfessionalProfile {
  id: string;
  specialty: string | null;
  bio: string | null;
  photo_url: string | null;
  is_verified: boolean;
  rating: number;
  created_at: string;
  profiles: { username: string; avatar_url: string | null } | null;
}

export default function ProfessionalDetailPage() {
  const params = useParams();
  const [professional, setProfessional] = useState<ProfessionalProfile | null>(null);
  const [opinions, setOpinions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const fetchData = async () => {
      const { data: proData } = await supabase
        .from("professional_profiles")
        .select(`
          *,
          profiles (username, avatar_url)
        `)
        .eq("user_id", params.id)
        .single();

      if (proData) setProfessional(proData);

      if (proData) {
        const { data: opinionsData } = await supabase
          .from("professional_opinions")
          .select(`
            *,
            conflicts (title, option_a, option_b)
          `)
          .eq("professional_id", proData.id)
          .order("created_at", { ascending: false });

        if (opinionsData) setOpinions(opinionsData);
      }
      setLoading(false);
    };

    fetchData();
  }, [params.id]);

  if (loading || !professional) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900">Perfil profesional</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Profile */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
          {professional.photo_url ? (
            <img
              src={professional.photo_url}
              alt={professional.profiles?.username || "Profesional"}
              className="w-20 h-20 rounded-full object-cover border-2 border-gray-100 mx-auto mb-3"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
              {professional.profiles?.username?.[0]?.toUpperCase() || "?"}
            </div>
          )}
          <div className="flex items-center justify-center gap-1.5">
            <h2 className="text-lg font-bold text-gray-900">{professional.profiles?.username}</h2>
            {professional.is_verified && <BadgeCheck className="w-5 h-5 text-rose-600" />}
          </div>
          <p className="text-sm text-gray-500">{professional.specialty || "Psicologo/a"}</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-medium text-gray-700">{professional.rating.toFixed(1)}</span>
          </div>
          {professional.bio && (
            <p className="text-sm text-gray-600 mt-3">{professional.bio}</p>
          )}
        </div>

        {/* Opinions */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-rose-600" />
            Dictamenes ({opinions.length})
          </h3>
          {opinions.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Aun no tiene dictamenes</p>
          ) : (
            <div className="space-y-3">
              {opinions.map((opinion) => (
                <div key={opinion.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs text-gray-500 mb-1">{opinion.conflicts?.title}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      opinion.selected_option === "A"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-purple-100 text-purple-700"
                    }`}>
                      Elige {opinion.selected_option}
                    </span>
                  </div>
                  {opinion.feedback_text && (
                    <p className="text-sm text-gray-700 mt-2">{opinion.feedback_text}</p>
                  )}
                  {opinion.audio_url && (
                    <div className="mt-2">
                      <AudioPlayer src={opinion.audio_url} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
