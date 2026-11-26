import { Suspense } from "react";
import type { Metadata } from "next";
import { MusicView } from "./music-view";

export const metadata: Metadata = { title: "Músicas" };
export default function Page() { return <Suspense><MusicView /></Suspense>; }
