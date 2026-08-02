import Link from "next/link";
import { MessageCircle, Stethoscope } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-dvh">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <img src="/logo.svg" alt="KimiK" className="h-16 mb-6" />
        <p className="text-gray-500 text-center mb-8 max-w-xs">
          Conflictos de pareja resueltos por la comunidad y expertos
        </p>

        {/* Features */}
        <div className="w-full space-y-3 mb-10">
          <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Vota y decide</p>
              <p className="text-xs text-gray-500">La comunidad elige quien tiene la razon</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Dictamen profesional</p>
              <p className="text-xs text-gray-500">Psicologos y terapeutas verificados</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/register"
          className="w-full py-3.5 bg-rose-600 text-white text-center rounded-2xl font-semibold text-sm hover:bg-rose-700 active:scale-[0.98] transition-all"
        >
          Crear cuenta gratis
        </Link>
        <Link
          href="/login"
          className="w-full py-3.5 text-center text-rose-600 font-medium text-sm mt-3"
        >
          Ya tengo cuenta
        </Link>
      </div>
    </div>
  );
}
