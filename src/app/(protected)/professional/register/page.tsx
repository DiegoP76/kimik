"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Camera, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function RegisterProfessionalPage() {
  const [licenseNumber, setLicenseNumber] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imagenes");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("La imagen debe ser menor a 2MB");
      return;
    }

    setPhotoFile(file);
    setError("");

    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Debes iniciar sesion");
      setLoading(false);
      return;
    }

    let photoUrl = null;
    if (photoFile) {
      const fileExt = photoFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("professional-photos")
        .upload(fileName, photoFile);

      if (uploadError) {
        setError("Error al subir la foto");
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("professional-photos")
        .getPublicUrl(uploadData.path);
      photoUrl = urlData.publicUrl;
    }

    const { error: insertError } = await supabase.from("professional_profiles").insert({
      user_id: user.id,
      license_number: licenseNumber.trim(),
      specialty: specialty.trim() || null,
      bio: bio.trim() || null,
      photo_url: photoUrl,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        setError("Ya tienes un perfil profesional registrado");
      } else {
        setError("Error al registrar perfil profesional");
      }
      setLoading(false);
      return;
    }

    await supabase.from("profiles").update({ role: "professional" }).eq("id", user.id);

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="flex flex-col min-h-dvh px-6 py-12">
        <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Solicitud enviada</h1>
          <p className="text-sm text-gray-500 mb-6">
            Tu perfil profesional esta pendiente de verificacion. Recibiras una notificacion cuando sea aprobado.
          </p>
          <Link
            href="/feed"
            className="w-full py-3.5 bg-rose-600 text-white rounded-xl font-semibold text-sm text-center"
          >
            Volver al feed
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/profile" className="p-1">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Ser profesional</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-5">
        <p className="text-sm text-gray-600 bg-blue-50 p-4 rounded-xl">
          Registrate como profesional verificado para dar dictamenes en conflictos y ganar reputacion.
        </p>

        {/* Photo Upload */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Foto de perfil (opcional)</label>
          <p className="text-xs text-gray-500 mb-3">Cuadrada, maximo 2MB. JPG, PNG o WebP.</p>

          {photoPreview ? (
            <div className="relative w-24 h-24 mx-auto">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-gray-200">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={removePhoto}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center gap-2 py-6 border-2 border-dashed border-gray-200 rounded-2xl hover:border-rose-300 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Camera className="w-5 h-5 text-gray-500" />
              </div>
              <span className="text-xs text-gray-500">Seleccionar foto</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            className="hidden"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Numero de licencia</label>
          <input
            type="text"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            placeholder="Ej: PSIC-12345"
            required
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Especialidad</label>
          <input
            type="text"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="Ej: Terapia de parejas"
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Biografia corta</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Cuentanos sobre tu experiencia..."
            rows={3}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !licenseNumber.trim()}
          className="w-full py-3.5 bg-rose-600 text-white rounded-xl font-semibold text-sm hover:bg-rose-700 disabled:opacity-50 active:scale-[0.98] transition-all"
        >
          {loading ? "Enviando..." : "Solicitar verificacion"}
        </button>
      </form>
    </div>
  );
}
