import type { Metadata } from "next";
import { SpaceView } from "./space-view";

export const metadata: Metadata = { title: "Meu Espaço" };
export default function Page() { return <SpaceView />; }
