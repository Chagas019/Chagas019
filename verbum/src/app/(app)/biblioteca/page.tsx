import type { Metadata } from "next";
import { LibraryView } from "./library-view";

export const metadata: Metadata = { title: "Biblioteca teológica" };
export default function Page() { return <LibraryView />; }
