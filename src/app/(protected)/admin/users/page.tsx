"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Shield, Users, Search, Edit2, Trash2, Ban, Clock, X, Save, UserX, Lock, MessageSquare } from "lucide-react";
import Link from "next/link";
import { cn, formatTimeAgo } from "@/lib/utils";

interface User {
  id: string;
  username: string;
  avatar_url: string | null;
  role: string;
  is_blocked: boolean;
  blocked_until: string | null;
  blocked_permanently: boolean;
  block_reason: string | null;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editRole, setEditRole] = useState("");
  const [showBlockModal, setShowBlockModal] = useState<User | null>(null);
  const [blockDays, setBlockDays] = useState(15);
  const [blockReason, setBlockReason] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState<User | null>(null);
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

      await fetchUsers();
    };

    const fetchUsers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) setUsers(data);
      setLoading(false);
    };

    checkAdmin();
  }, [router]);

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ username: editUsername, role: editRole })
      .eq("id", editingUser.id);

    setUsers((prev) =>
      prev.map((u) => u.id === editingUser.id ? { ...u, username: editUsername, role: editRole } : u)
    );
    setEditingUser(null);
  };

  const handleBlockTemporary = async () => {
    if (!showBlockModal) return;
    const supabase = createClient();
    const blockedUntil = new Date();
    blockedUntil.setDate(blockedUntil.getDate() + blockDays);

    await supabase
      .from("profiles")
      .update({
        is_blocked: true,
        blocked_until: blockedUntil.toISOString(),
        blocked_permanently: false,
        block_reason: blockReason.trim() || null,
      })
      .eq("id", showBlockModal.id);

    setUsers((prev) =>
      prev.map((u) => u.id === showBlockModal.id ? {
        ...u,
        is_blocked: true,
        blocked_until: blockedUntil.toISOString(),
        blocked_permanently: false,
        block_reason: blockReason.trim() || null,
      } : u)
    );
    setShowBlockModal(null);
    setBlockReason("");
  };

  const handleBlockPermanent = async () => {
    if (!showBlockModal) return;
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({
        is_blocked: true,
        blocked_until: null,
        blocked_permanently: true,
        block_reason: blockReason.trim() || null,
      })
      .eq("id", showBlockModal.id);

    setUsers((prev) =>
      prev.map((u) => u.id === showBlockModal.id ? {
        ...u,
        is_blocked: true,
        blocked_until: null,
        blocked_permanently: true,
        block_reason: blockReason.trim() || null,
      } : u)
    );
    setShowBlockModal(null);
    setBlockReason("");
  };

  const handleUnblock = async (userId: string) => {
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ is_blocked: false, blocked_until: null, blocked_permanently: false, block_reason: null })
      .eq("id", userId);

    setUsers((prev) =>
      prev.map((u) => u.id === userId ? { ...u, is_blocked: false, blocked_until: null, blocked_permanently: false, block_reason: null } : u)
    );
  };

  const handleDelete = async () => {
    if (!showDeleteModal) return;
    const supabase = createClient();

    await supabase.from("votes").delete().eq("user_id", showDeleteModal.id);
    await supabase.from("conflicts").delete().eq("user_id", showDeleteModal.id);
    await supabase.from("professional_profiles").delete().eq("user_id", showDeleteModal.id);
    await supabase.from("profiles").delete().eq("id", showDeleteModal.id);

    setUsers((prev) => prev.filter((u) => u.id !== showDeleteModal.id));
    setShowDeleteModal(null);
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

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/admin" className="p-1">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Usuarios ({users.length})</h1>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o rol..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="p-4 space-y-3">
        {filteredUsers.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-10">No se encontraron usuarios</p>
        ) : (
          filteredUsers.map((user) => (
            <div key={user.id} className={cn(
              "bg-white rounded-2xl border p-4",
              user.is_blocked ? "border-red-200 bg-red-50/50" : "border-gray-100"
            )}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                    {user.username[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{user.username}</p>
                    <p className="text-xs text-gray-500">Registro: {formatTimeAgo(user.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-medium",
                    user.role === "admin" ? "bg-rose-100 text-rose-700" :
                    user.role === "professional" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-600"
                  )}>
                    {user.role}
                  </span>
                  {user.is_blocked && (
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-medium",
                      user.blocked_permanently ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                    )}>
                      {user.blocked_permanently ? "Bloqueado" : `Hasta ${new Date(user.blocked_until!).toLocaleDateString("es-AR")}`}
                    </span>
                  )}
                </div>
              </div>

              {/* Block reason */}
              {user.is_blocked && user.block_reason && (
                <div className="mb-3 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MessageSquare className="w-3 h-3 text-orange-600" />
                    <span className="text-[10px] font-semibold text-orange-700">Motivo del bloqueo:</span>
                  </div>
                  <p className="text-xs text-orange-800">{user.block_reason}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingUser(user);
                    setEditUsername(user.username);
                    setEditRole(user.role);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar
                </button>
                {user.is_blocked ? (
                  <button
                    onClick={() => handleUnblock(user.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-100 text-green-700 rounded-xl text-xs font-medium"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Desbloquear
                  </button>
                ) : (
                  <button
                    onClick={() => setShowBlockModal(user)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-orange-100 text-orange-700 rounded-xl text-xs font-medium"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Bloquear
                  </button>
                )}
                <button
                  onClick={() => setShowDeleteModal(user)}
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
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditingUser(null)} />
          <div className="relative bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Editar usuario</h3>
              <button onClick={() => setEditingUser(null)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Username</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Rol</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="user">User</option>
                  <option value="professional">Professional</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setEditingUser(null)}
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

      {/* Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowBlockModal(null); setBlockReason(""); }} />
          <div className="relative bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Bloquear usuario</h3>
              <button onClick={() => { setShowBlockModal(null); setBlockReason(""); }} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Selecciona el tipo de bloqueo para <span className="font-semibold">{showBlockModal.username}</span>:
            </p>

            {/* Reason field */}
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-700 mb-1 block">Motivo (opcional)</label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Ej: Uso de lenguaje inapropiado..."
                rows={2}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              />
            </div>

            <div className="space-y-3">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <p className="text-sm font-semibold text-orange-800">Temporal</p>
                </div>
                <p className="text-xs text-orange-700 mb-3">Se desbloquea automaticamente despues del periodo seleccionado.</p>
                <div className="flex items-center gap-2">
                  <select
                    value={blockDays}
                    onChange={(e) => setBlockDays(Number(e.target.value))}
                    className="px-3 py-1.5 bg-white border border-orange-200 rounded-lg text-sm"
                  >
                    <option value={3}>3 dias</option>
                    <option value={7}>7 dias</option>
                    <option value={15}>15 dias</option>
                    <option value={30}>30 dias</option>
                  </select>
                  <button
                    onClick={handleBlockTemporary}
                    className="flex-1 py-2 bg-orange-600 text-white rounded-xl text-sm font-semibold"
                  >
                    Bloquear
                  </button>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserX className="w-4 h-4 text-red-600" />
                  <p className="text-sm font-semibold text-red-800">Permanente</p>
                </div>
                <p className="text-xs text-red-700 mb-3">El usuario no podra acceder hasta que un admin lo desbloquee.</p>
                <button
                  onClick={handleBlockPermanent}
                  className="w-full py-2 bg-red-600 text-white rounded-xl text-sm font-semibold"
                >
                  Bloquear permanentemente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDeleteModal(null)} />
          <div className="relative bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Eliminar usuario</h3>
              <button onClick={() => setShowDeleteModal(null)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Se eliminara permanentemente <span className="font-semibold">{showDeleteModal.username}</span> y todos sus datos (conflictos, votos, etc). Esta accion no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
