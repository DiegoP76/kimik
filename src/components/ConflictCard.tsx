"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn, formatTimeAgo } from "@/lib/utils";
import { Vote, BadgeCheck, MapPin } from "lucide-react";
import { AudioPlayer } from "./AudioPlayer";

interface ConflictWithVotes {
  id: string;
  title: string;
  description: string | null;
  audio_url: string | null;
  option_a: string;
  option_b: string;
  category: string;
  location: string | null;
  is_premium_analysis: boolean;
  created_at: string;
  profiles: { username: string; avatar_url: string | null } | null;
  votes: { selected_option: "A" | "B" }[];
  professional_opinions: { id: string }[];
}

interface ConflictCardProps {
  conflict: ConflictWithVotes;
  onVote?: (conflictId: string, option: "A" | "B") => void;
}

export function ConflictCard({ conflict, onVote }: ConflictCardProps) {
  const [userVote, setUserVote] = useState<"A" | "B" | null>(null);
  const [counts, setCounts] = useState({ a: 0, b: 0 });
  const [hasVoted, setHasVoted] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const getVoteCounts = async () => {
      const { data } = await supabase.rpc("get_vote_counts", {
        conflict_uuid: conflict.id,
      });
      if (data) {
        setCounts({ a: Number(data[0]?.option_a_count || 0), b: Number(data[0]?.option_b_count || 0) });
      }
    };

    const checkUserVote = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("votes")
          .select("selected_option")
          .eq("conflict_id", conflict.id)
          .eq("user_id", user.id)
          .single();
        if (data) {
          setUserVote(data.selected_option as "A" | "B");
          setHasVoted(true);
        }
      }
    };

    getVoteCounts();
    checkUserVote();

    const channel = supabase
      .channel(`votes-${conflict.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "votes", filter: `conflict_id=eq.${conflict.id}` }, () => {
        getVoteCounts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conflict.id]);

  const handleVote = async (option: "A" | "B") => {
    if (hasVoted) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("votes").insert({
      conflict_id: conflict.id,
      user_id: user.id,
      selected_option: option,
    });

    setUserVote(option);
    setHasVoted(true);
    setCounts((prev) => ({
      a: option === "A" ? prev.a + 1 : prev.a,
      b: option === "B" ? prev.b + 1 : prev.b,
    }));

    if (onVote) onVote(conflict.id, option);
  };

  const totalVotes = counts.a + counts.b;
  const pctA = totalVotes > 0 ? (counts.a / totalVotes) * 100 : 50;
  const pctB = totalVotes > 0 ? (counts.b / totalVotes) * 100 : 50;

  // Dynamic colors: more votes = green, less = red, equal = neutral
  const aWins = counts.a > counts.b;
  const bWins = counts.b > counts.a;
  const optionAColor = hasVoted ? (aWins ? { bar: "bg-green-100", text: "text-green-700", pct: "text-green-600", ring: "ring-green-500" } : bWins ? { bar: "bg-red-100", text: "text-red-700", pct: "text-red-600", ring: "ring-red-500" } : { bar: "bg-gray-100", text: "text-gray-700", pct: "text-gray-600", ring: "ring-gray-400" }) : null;
  const optionBColor = hasVoted ? (bWins ? { bar: "bg-green-100", text: "text-green-700", pct: "text-green-600", ring: "ring-green-500" } : aWins ? { bar: "bg-red-100", text: "text-red-700", pct: "text-red-600", ring: "ring-red-500" } : { bar: "bg-gray-100", text: "text-gray-700", pct: "text-gray-600", ring: "ring-gray-400" }) : null;

  const categoryColors: Record<string, string> = {
    convivencia: "bg-blue-100 text-blue-700",
    celos: "bg-red-100 text-red-700",
    dinero: "bg-green-100 text-green-700",
    familia: "bg-purple-100 text-purple-700",
    otros: "bg-gray-100 text-gray-700",
  };

  const descriptionText = conflict.description || "";
  const isLong = descriptionText.length > 120;
  const displayText = !expanded && isLong ? descriptionText.slice(0, 120) + "..." : descriptionText;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
              {conflict.profiles?.username?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {conflict.profiles?.username || "Anonimo"}
              </p>
              <p className="text-[10px] text-gray-500">{formatTimeAgo(conflict.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {conflict.is_premium_analysis && (
              <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] rounded-full px-2 py-0.5 font-medium">
                ⚡ Express
              </span>
            )}
            {conflict.professional_opinions.length > 0 && (
              <span className="bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[10px] rounded-full px-2 py-0.5 font-medium flex items-center gap-1">
                <BadgeCheck className="w-3 h-3" /> Dictamen
              </span>
            )}
            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", categoryColors[conflict.category] || categoryColors.otros)}>
              {conflict.category}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-900 mb-2">{conflict.title}</h3>

        {/* Expandable Description */}
        {descriptionText && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{displayText}</p>
            {isLong && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-rose-600 font-medium mt-1 hover:underline"
              >
                {expanded ? "ver menos" : "ver mas"}
              </button>
            )}
          </div>
        )}

        {/* Audio */}
        {conflict.audio_url && (
          <div className="mb-4">
            <AudioPlayer src={conflict.audio_url} />
          </div>
        )}

        {/* Vote Options */}
        <div className="space-y-2.5">
          <button
            onClick={() => handleVote("A")}
            disabled={hasVoted}
            className={cn(
              "w-full relative overflow-hidden rounded-xl p-3 text-left transition-all",
              hasVoted && userVote === "A" && `ring-2 ${optionAColor?.ring}`,
              hasVoted ? "cursor-default" : "active:scale-[0.98]"
            )}
          >
            {hasVoted && (
              <div className={cn("absolute inset-0 rounded-xl", optionAColor?.bar)} style={{ width: `${pctA}%` }} />
            )}
            <div className="relative flex items-center justify-between">
              <span className={cn("text-sm font-medium", hasVoted ? optionAColor?.text : "text-gray-700")}>
                {conflict.option_a}
              </span>
              {hasVoted && (
                <span className={cn("text-xs font-bold", optionAColor?.pct)}>{Math.round(pctA)}%</span>
              )}
            </div>
          </button>

          <div className="text-center text-xs text-gray-400 font-medium">VS</div>

          <button
            onClick={() => handleVote("B")}
            disabled={hasVoted}
            className={cn(
              "w-full relative overflow-hidden rounded-xl p-3 text-left transition-all",
              hasVoted && userVote === "B" && `ring-2 ${optionBColor?.ring}`,
              hasVoted ? "cursor-default" : "active:scale-[0.98]"
            )}
          >
            {hasVoted && (
              <div className={cn("absolute inset-0 rounded-xl", optionBColor?.bar)} style={{ width: `${pctB}%` }} />
            )}
            <div className="relative flex items-center justify-between">
              <span className={cn("text-sm font-medium", hasVoted ? optionBColor?.text : "text-gray-700")}>
                {conflict.option_b}
              </span>
              {hasVoted && (
                <span className={cn("text-xs font-bold", optionBColor?.pct)}>{Math.round(pctB)}%</span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-50 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-gray-500">
            <Vote className="w-3.5 h-3.5" />
            <span className="text-xs">{totalVotes} votos</span>
          </div>
          {conflict.location && (
            <div className="flex items-center gap-1 text-gray-500">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-xs">{conflict.location}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
