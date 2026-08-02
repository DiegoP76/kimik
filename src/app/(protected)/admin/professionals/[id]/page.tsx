"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Shield, Save, BadgeCheck, Trash2 } from "lucide-react";
import Link from "next/link";

interface ProfessionalData {
  id: string;
  user_id: string;
  license_number: string;
  specialty: string | null;
  bio: string | null;
  photo_url: string | null;
  instagram: string | null;
  whatsapp: string | null;
  is_verified: boolean;
  rating: number;
  created_at: string;
  profiles: { username: string; email?: string } | null;
}

export default function AdminProfessionalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [professional, setProfessional] = useState<ProfessionalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [licenseNumber, setLicenseNumber] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [isVerified, setIsVerified] = useState(false);

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

      await fetchProfessional();
    };

    const fetchProfessional = async () => {
      const { data } = await supabase
        .from("professional_profiles")
        .select(`
          *,
          profiles (username)
        `)
        .eq("id", params.id)
        .single();

      if (data) {
        setProfessional(data as ProfessionalData);
        setLicenseNumber(data.license_number);
        setSpecialty(data.specialty || "");
        setBio(data.bio || "");
        setInstagram(data.instagram || "");
        setWhatsapp(data.whatsapp || "");
        setIsVerified(data.is_verified);
      }
      setLoading(false);
    };

    checkAdmin();
  }, [params.id, router]);

  const handleSave = async () => {
    if (!professional) return;
    setSaving(true);
    const supabase = createClient();

    await supabase
      .from("professional_profiles")
      .update({
        license_number: licenseNumber.trim(),
        specialty: specialty.trim() || null,
        bio: bio.trim() || null,
        instagram: instagram.trim() || null,
        whatsapp: whatsapp.trim() || null,
        is_verified: isVerified,
      })
      .eq("id", professional.id);

    if (isVerified) {
      await supabase
        .from("profiles")
        .update({ role: "professional" })
        .eq("id", professional.user_id);
    }

    setSuccess(true);
    setSaving(false);
    setTimeout(() => setSuccess(false), 2000);
  };

  const handleDelete = async () => {
    if (!professional) return;
    if (!confirm("Eliminar este perfil profesional?")) return;

    const supabase = createClient();
    await supabase.from("professional_profiles").delete().eq("id", professional.id);
    await supabase.from("profiles").update({ role: "user" }).eq("id", professional.user_id);
    router.push("/admin/professionals");
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

  if (!professional) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <p className="text-gray-500">Profesional no encontrado</p>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/admin/professionals" className="p-1">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </Link>
            <h1 className="text-lg font-bold text-gray-900">Editar profesional</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-medium"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      {success && (
        <div className="mx-4 mt-3 p-3 bg-green-50 text-green-700 rounded-xl text-sm">
          Cambios guardados correctamente
        </div>
      )}

      <div className="p-4 space-y-5">
        {/* Profile Header */}
        <div className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-4">
          {professional.photo_url ? (
            <img
              src={professional.photo_url}
              alt={professional.profiles?.username || "Profesional"}
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-100"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
              {professional.profiles?.username?.[0]?.toUpperCase() || "?"}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-gray-900">{professional.profiles?.username}</p>
            <p className="text-xs text-gray-500">ID: {professional.user_id.slice(0, 8)}...</p>
          </div>
        </div>

        {/* Verification Status */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-rose-600" />
              <span className="text-sm font-medium text-gray-900">Profesional verificado</span>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={isVerified}
                onChange={(e) => setIsVerified(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-11 h-6 rounded-full transition-colors ${isVerified ? "bg-green-500" : "bg-gray-300"}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform mt-0.5 ${isVerified ? "translate-x-[22px]" : "translate-x-0.5"}`} />
              </div>
            </div>
          </label>
        </div>

        {/* Edit Fields */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Numero de licencia</label>
            <input
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Especialidad</label>
            <input
              type="text"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Biografia</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Instagram</label>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@usuario"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">WhatsApp</label>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="1112345678"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 rounded-2xl border border-red-200 p-4">
          <p className="text-sm font-medium text-red-800 mb-3">Zona de peligro</p>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-xs font-medium hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar perfil profesional
          </button>
        </div>
      </div>
    </div>
  );
}
