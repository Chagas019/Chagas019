import { Suspense } from "react";
import type { Metadata } from "next";
import { SermonsView } from "./sermons-view";

export const metadata: Metadata = { title: "Pregações" };
export default function Page() { return <Suspense><SermonsView /></Suspense>; }
