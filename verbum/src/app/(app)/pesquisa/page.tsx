import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchView } from "./search-view";

export const metadata: Metadata = { title: "Pesquisar" };

export default function Page() {
  return <Suspense><SearchView /></Suspense>;
}
