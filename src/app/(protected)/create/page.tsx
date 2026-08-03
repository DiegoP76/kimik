"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/Navbar";
import { AudioRecorder } from "@/components/AudioRecorder";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function CreateConflictPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [category, setCategory] = useState<string>("otros");
  const [location, setLocation] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("created_at", { ascending: true });
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  const handleSubmit = async () => {
    setShowConfirm(false);
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Debes iniciar sesion");
      setLoading(false);
      return;
    }

    let audioUrl = null;
    if (audioBlob) {
      const fileName = `${user.id}/${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("conflict-audios")
        .upload(fileName, audioBlob);

      if (uploadError) {
        setError("Error al subir el audio");
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("conflict-audios")
        .getPublicUrl(uploadData.path);
      audioUrl = urlData.publicUrl;
    }

    const { data: insertData, error: insertError } = await supabase.from("conflicts").insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      audio_url: audioUrl,
      option_a: optionA.trim(),
      option_b: optionB.trim(),
      category,
      location: location.trim() || null,
    }).select("id").single();

    if (insertError) {
      setError(insertError.message || "Error al publicar el conflicto");
      setLoading(false);
      return;
    }

    // Send push notifications to other users
    try {
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conflictId: insertData.id,
          title: title.trim(),
          author: user.id,
        }),
      });
    } catch {
      // Notification failed, but conflict was created - ignore
    }

    router.push("/feed");
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/feed" className="p-1">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Nuevo conflicto</h1>
          <div className="w-7" />
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="p-4 space-y-5">
        {/* Title */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Titulo del conflicto</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Quien debe lavar los platos?"
            maxLength={150}
            required
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Cuenta la situacion (opcional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Cuenta que paso..."
            rows={3}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
          />
        </div>

        {/* Audio */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Nota de voz (opcional)</label>
          <AudioRecorder onRecordingComplete={setAudioBlob} />
          {audioBlob && (
            <p className="text-xs text-green-600 mt-2">Audio grabado ({(audioBlob.size / 1024).toFixed(0)} KB)</p>
          )}
        </div>

        {/* Options */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Las dos opciones</label>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold shrink-0">A</span>
              <input
                type="text"
                value={optionA}
                onChange={(e) => setOptionA(e.target.value)}
                placeholder="Opcion A"
                maxLength={100}
                required
                className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold shrink-0">B</span>
              <input
                type="text"
                value={optionB}
                onChange={(e) => setOptionB(e.target.value)}
                placeholder="Opcion B"
                maxLength={100}
                required
                className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Categoria</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.slug}
                type="button"
                onClick={() => setCategory(cat.slug)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  category === cat.slug
                    ? "bg-rose-600 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Localidad / Ciudad (opcional)</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ej: Buenos Aires"
            maxLength={100}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !title.trim() || !optionA.trim() || !optionB.trim()}
          className="w-full py-3.5 bg-rose-600 text-white rounded-xl font-semibold text-sm hover:bg-rose-700 disabled:opacity-50 active:scale-[0.98] transition-all"
        >
          {loading ? "Publicando..." : "Publicar conflicto"}
        </button>
      </form>

      {/* Confirm Popup */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Revisar antes de publicar</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              Una vez publicado, el conflicto <span className="font-semibold text-gray-900">no se puede editar ni eliminar</span>. Asegurate de que todo este bien antes de continuar.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-[0.98] transition-all"
              >
                Revisar
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                {loading ? "Publicando..." : "Publicar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Navbar />
    </div>
  );
}
