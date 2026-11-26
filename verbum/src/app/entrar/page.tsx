import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/brand";

export const metadata: Metadata = { title: "Entrar" };

export default function Entrar() {
  return (
    <div className="paper flex min-h-screen flex-col items-center justify-center bg-ivory-50 px-4 py-12">
      <div className="mb-8"><Logo /></div>
      <Suspense><LoginForm /></Suspense>
    </div>
  );
}
