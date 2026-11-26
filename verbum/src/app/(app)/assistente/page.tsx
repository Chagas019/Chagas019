import { Suspense } from "react";
import type { Metadata } from "next";
import { AssistantView } from "./assistant-view";

export const metadata: Metadata = { title: "Preparar minha pregação" };
export default function Page() { return <Suspense><AssistantView /></Suspense>; }
