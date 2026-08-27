"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, UserCheck } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/feed");
    router.refresh();
  };

  const handleGuestLogin = async () => {
    setGuestLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInAnonymously();

    if (authError) {
      setError("No se pudo entrar como invitado");
      setGuestLoading(false);
      return;
    }

    if (data.user) {
      const guestName = `Invitado_${data.user.id.slice(0, 6)}`;
      await supabase.from("profiles").upsert({
        id: data.user.id,
        username: guestName,
      });
    }

    router.push("/feed");
    router.refresh();
  };

  return (
    <div className="flex flex-col min-h-dvh px-6 py-12">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <img src="/logo.svg" alt="KimiK" className="h-12 mb-8" />
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Bienvenido de vuelta</h1>
        <p className="text-gray-500 text-sm mb-8">Inicia sesion para continuar</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Contrasena</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contrasena"
                required
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs text-rose-600 font-medium">
                Olvidaste tu contrasena?
              </Link>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-rose-600 text-white rounded-xl font-semibold text-sm hover:bg-rose-700 disabled:opacity-50 active:scale-[0.98] transition-all"
          >
            {loading ? "Iniciando sesion..." : "Iniciar sesion"}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-gray-400">o</span>
          </div>
        </div>

        <button
          onClick={handleGuestLogin}
          disabled={guestLoading}
          className="w-full py-3.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <UserCheck className="w-4 h-4" />
          {guestLoading ? "Entrando..." : "Entrar como invitado"}
        </button>

        <p className="text-center text-sm text-gray-500 mt-8">
          No tienes cuenta?{" "}
          <Link href="/register" className="text-rose-600 font-medium">
            Registrate
          </Link>
        </p>
      </div>
    </div>
  );
}
