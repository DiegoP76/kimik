"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Shield, AlertTriangle, Trash2, Eye, Edit2, Save, X, Search, MapPin, Vote } from "lucide-react";
import Link from "next/link";
import { cn, formatTimeAgo } from "@/lib/utils";

interface Conflict {
  id: string;
  title: string;
  description: string | null;
  option_a: string;
  option_b: string;
  category: string;
  location: string | null;
  status: string;
  created_at: string;
  profiles: { username: string } | null;
  votes: { id: string }[];
}

export default function AdminConflictsPage() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [search, setSearch] = useState("");
  const [editingConflict, setEditingConflict] = useState<Conflict | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editOptionA, setEditOptionA] = useState("");
  const [editOptionB, setEditOptionB] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [categories, setCategories] = useState<{ name: string; slug: string }[]>([]);
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
      await fetchCategories();
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

    const fetchCategories = async () => {
      const { data } = await supabase
        .from("categories")
        .select("name, slug")
        .eq("is_active", true);
      if (data) setCategories(data);
    };

    checkAdmin();
  }, [router]);

  const filteredConflicts = conflicts.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.profiles?.username?.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleSaveEdit = async () => {
    if (!editingConflict) return;
    const supabase = createClient();
    await supabase
      .from("conflicts")
      .update({
        title: editTitle,
        description: editDescription || null,
        option_a: editOptionA,
        option_b: editOptionB,
        category: editCategory,
        location: editLocation || null,
        status: editStatus,
      })
      .eq("id", editingConflict.id);

    setConflicts((prev) =>
      prev.map((c) => c.id === editingConflict.id ? {
        ...c,
        title: editTitle,
        description: editDescription || null,
        option_a: editOptionA,
        option_b: editOptionB,
        category: editCategory,
        location: editLocation || null,
        status: editStatus,
      } : c)
    );
    setEditingConflict(null);
  };

  const handleDelete = async (conflictId: string) => {
    if (!confirm("Eliminar este conflicto permanentemente?")) return;
    const supabase = createClient();
    await supabase.from("votes").delete().eq("conflict_id", conflictId);
    await supabase.from("professional_opinions").delete().eq("conflict_id", conflictId);
    await supabase.from("conflicts").delete().eq("id", conflictId);
    setConflicts((prev) => prev.filter((c) => c.id !== conflictId));
  };

  const handleStatusChange = async (conflictId: string, newStatus: string) => {
    const supabase = createClient();
    await supabase.from("conflicts").update({ status: newStatus }).eq("id", conflictId);
    setConflicts((prev) => prev.map((c) => c.id === conflictId ? { ...c, status: newStatus } : c));
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
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/admin" className="p-1">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Conflictos ({conflicts.length})</h1>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por titulo, usuario o categoria..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>
      </div>

      {/* Conflict List */}
      <div className="p-4 space-y-3">
        {filteredConflicts.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-10">No hay conflictos</p>
        ) : (
          filteredConflicts.map((conflict) => (
            <div key={conflict.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{conflict.title}</p>
                  <p className="text-xs text-gray-500">
                    @{conflict.profiles?.username} · {formatTimeAgo(conflict.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", statusColors[conflict.status] || statusColors.active)}>
                    {conflict.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                <div className="flex items-center gap-1">
                  <Vote className="w-3.5 h-3.5" />
                  <span>{conflict.votes.length} votos</span>
                </div>
                {conflict.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{conflict.location}</span>
                  </div>
                )}
                <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">{conflict.category}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingConflict(conflict);
                    setEditTitle(conflict.title);
                    setEditDescription(conflict.description || "");
                    setEditOptionA(conflict.option_a);
                    setEditOptionB(conflict.option_b);
                    setEditCategory(conflict.category);
                    setEditLocation(conflict.location || "");
                    setEditStatus(conflict.status);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-100 text-blue-700 rounded-xl text-xs font-medium"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar
                </button>
                <Link
                  href={`/conflict/${conflict.id}`}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver
                </Link>
                {conflict.status === "active" ? (
                  <button
                    onClick={() => handleStatusChange(conflict.id, "flagged")}
                    className="flex items-center justify-center gap-1 py-2 px-3 bg-orange-100 text-orange-700 rounded-xl text-xs font-medium"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </button>
                ) : conflict.status === "flagged" ? (
                  <button
                    onClick={() => handleStatusChange(conflict.id, "active")}
                    className="flex items-center justify-center gap-1 py-2 px-3 bg-green-100 text-green-700 rounded-xl text-xs font-medium"
                  >
                    Activar
                  </button>
                ) : null}
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

      {/* Edit Modal */}
      {editingConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditingConflict(null)} />
          <div className="relative bg-white rounded-2xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Editar conflicto</h3>
              <button onClick={() => setEditingConflict(null)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Titulo</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={150}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Descripcion</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Opcion A</label>
                  <input
                    type="text"
                    value={editOptionA}
                    onChange={(e) => setEditOptionA(e.target.value)}
                    maxLength={100}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Opcion B</label>
                  <input
                    type="text"
                    value={editOptionB}
                    onChange={(e) => setEditOptionB(e.target.value)}
                    maxLength={100}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Categoria</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Estado</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="active">Active</option>
                    <option value="resolved">Resolved</option>
                    <option value="flagged">Flagged</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Localidad</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  maxLength={100}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setEditingConflict(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-rose-600 text-white"
              >
                <Save className="w-4 h-4 inline mr-1" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
