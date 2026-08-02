"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/Navbar";
import { AudioPlayer } from "@/components/AudioPlayer";
import { ArrowLeft, Vote, BadgeCheck } from "lucide-react";
import { cn, formatTimeAgo } from "@/lib/utils";
import Link from "next/link";

interface ConflictDetail {
  id: string;
  title: string;
  description: string | null;
  audio_url: string | null;
  option_a: string;
  option_b: string;
  category: string;
  created_at: string;
  profiles: { username: string; avatar_url: string | null } | null;
  professional_opinions: {
    id: string;
    selected_option: string;
    feedback_text: string | null;
    audio_url: string | null;
    created_at: string;
    professional_profiles: { specialty: string | null; is_verified: boolean } | null;
  }[];
}

export default function ConflictDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [conflict, setConflict] = useState<ConflictDetail | null>(null);
  const [userVote, setUserVote] = useState<"A" | "B" | null>(null);
  const [counts, setCounts] = useState({ a: 0, b: 0 });
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const fetchData = async () => {
      const { data } = await supabase
        .from("conflicts")
        .select(`
          *,
          profiles (username, avatar_url),
          professional_opinions (
            id, selected_option, feedback_text, audio_url, created_at,
            professional_profiles (specialty, is_verified)
          )
        `)
        .eq("id", params.id)
        .single();

      if (data) setConflict(data);

      const { data: voteData } = await supabase.rpc("get_vote_counts", {
        conflict_uuid: params.id,
      });
      if (voteData) {
        setCounts({ a: Number(voteData[0]?.option_a_count || 0), b: Number(voteData[0]?.option_b_count || 0) });
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existingVote } = await supabase
          .from("votes")
          .select("selected_option")
          .eq("conflict_id", params.id)
          .eq("user_id", user.id)
          .single();
        if (existingVote) {
          setUserVote(existingVote.selected_option as "A" | "B");
          setHasVoted(true);
        }
      }
      setLoading(false);
    };

    fetchData();

    const channel = supabase
      .channel(`conflict-${params.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "votes", filter: `conflict_id=eq.${params.id}` }, async () => {
        const { data } = await supabase.rpc("get_vote_counts", { conflict_uuid: params.id });
        if (data) setCounts({ a: Number(data[0]?.option_a_count || 0), b: Number(data[0]?.option_b_count || 0) });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [params.id]);

  const handleVote = async (option: "A" | "B") => {
    if (hasVoted) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("votes").insert({
      conflict_id: params.id as string,
      user_id: user.id,
      selected_option: option,
    });

    setUserVote(option);
    setHasVoted(true);
    setCounts((prev) => ({
      a: option === "A" ? prev.a + 1 : prev.a,
      b: option === "B" ? prev.b + 1 : prev.b,
    }));
  };

  if (loading || !conflict) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalVotes = counts.a + counts.b;
  const pctA = totalVotes > 0 ? (counts.a / totalVotes) * 100 : 50;
  const pctB = totalVotes > 0 ? (counts.b / totalVotes) * 100 : 50;

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-sm font-bold text-gray-900 truncate flex-1">{conflict.title}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Author */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
            {conflict.profiles?.username?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{conflict.profiles?.username || "Anonimo"}</p>
            <p className="text-[10px] text-gray-500">{formatTimeAgo(conflict.created_at)}</p>
          </div>
        </div>

        {/* Description */}
        {conflict.description && (
          <p className="text-sm text-gray-700 leading-relaxed">{conflict.description}</p>
        )}

        {/* Audio */}
        {conflict.audio_url && <AudioPlayer src={conflict.audio_url} />}

        {/* Vote Buttons */}
        <div className="space-y-2">
          <button
            onClick={() => handleVote("A")}
            disabled={hasVoted}
            className={cn(
              "w-full relative overflow-hidden rounded-2xl p-4 text-left transition-all",
              hasVoted && userVote === "A" && "ring-2 ring-rose-500",
              hasVoted ? "cursor-default" : "active:scale-[0.98]"
            )}
          >
            {hasVoted && (
              <div className="absolute inset-0 bg-rose-50 rounded-2xl" style={{ width: `${pctA}%` }} />
            )}
            <div className="relative flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-rose-500">OPCION A</span>
                <p className="text-sm font-medium text-gray-900">{conflict.option_a}</p>
              </div>
              {hasVoted && <span className="text-lg font-bold text-rose-600">{Math.round(pctA)}%</span>}
            </div>
          </button>

          <div className="text-center text-xs text-gray-400 font-bold">VS</div>

          <button
            onClick={() => handleVote("B")}
            disabled={hasVoted}
            className={cn(
              "w-full relative overflow-hidden rounded-2xl p-4 text-left transition-all",
              hasVoted && userVote === "B" && "ring-2 ring-purple-500",
              hasVoted ? "cursor-default" : "active:scale-[0.98]"
            )}
          >
            {hasVoted && (
              <div className="absolute inset-0 bg-purple-50 rounded-2xl" style={{ width: `${pctB}%` }} />
            )}
            <div className="relative flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-purple-500">OPCION B</span>
                <p className="text-sm font-medium text-gray-900">{conflict.option_b}</p>
              </div>
              {hasVoted && <span className="text-lg font-bold text-purple-600">{Math.round(pctB)}%</span>}
            </div>
          </button>
        </div>

        {/* Vote Count */}
        <div className="text-center text-xs text-gray-500">
          <Vote className="w-3.5 h-3.5 inline mr-1" />
          {totalVotes} votos totales
        </div>

        {/* Professional Opinions */}
        {conflict.professional_opinions.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-rose-600" />
              Dictamenes profesionales
            </h3>
            <div className="space-y-3">
              {conflict.professional_opinions.map((opinion) => (
                <div key={opinion.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                      Dr
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-900">
                        {opinion.professional_profiles?.specialty || "Psicologo/a"}
                      </p>
                      {opinion.professional_profiles?.is_verified && (
                        <span className="text-[10px] text-rose-600 flex items-center gap-0.5">
                          <BadgeCheck className="w-3 h-3" /> Verificado
                        </span>
                      )}
                    </div>
                    <span className={cn(
                      "ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold",
                      opinion.selected_option === "A" ? "bg-rose-100 text-rose-700" : "bg-purple-100 text-purple-700"
                    )}>
                      Elige {opinion.selected_option}
                    </span>
                  </div>
                  {opinion.feedback_text && (
                    <p className="text-sm text-gray-700">{opinion.feedback_text}</p>
                  )}
                  {opinion.audio_url && (
                    <div className="mt-2">
                      <AudioPlayer src={opinion.audio_url} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
