import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";

export const metadata: Metadata = { title: "Como instalar presets", description: "Guia para instalar presets XMP, DNG e ZIP no Lightroom Mobile e Desktop." };

const SECTIONS = [
  {
    t: "Lightroom Mobile (Android e iPhone)",
    steps: ["Baixe o arquivo .zip ou .xmp na sua biblioteca do PRESET LAB.", "Abra o Lightroom, entre numa foto e toque em Predefinições.", "Toque nos três pontos (⋯) › Importar predefinições.", "Escolha o arquivo baixado. O preset aparece no grupo “PRESET LAB”."],
  },
  {
    t: "Lightroom Classic e Lightroom (desktop)",
    steps: ["No menu Arquivo, escolha Importar perfis e predefinições.", "Selecione o .xmp ou o .zip — não precisa descompactar.", "Os presets aparecem no painel Predefinições, grupo “PRESET LAB”."],
  },
  {
    t: "Arquivos .DNG (método antigo do celular)",
    steps: ["Importe o .dng no Lightroom Mobile como se fosse uma foto.", "Abra a imagem, toque em ⋯ › Criar predefinição.", "Dê um nome e salve. Agora é só aplicar nas suas fotos."],
  },
  {
    t: "Depois de aplicar",
    steps: ["Ajuste exposição e temperatura para a sua luz.", "Se a pele ficar estranha, reduza saturação de laranja/vermelho no painel Cor.", "Use o controle Quantidade (Amount) para suavizar o efeito."],
  },
];

export default function HelpPage() {
  return (
    <>
      <PageHero kicker="Guia" title={<>Como <span className="serif-accent text-signal">instalar</span></>}>
        <p>Formatos aceitos: XMP (recomendado), ZIP com XMPs e DNG. Funciona no Lightroom Mobile gratuito.</p>
      </PageHero>
      <div className="container-lab grid gap-6 md:grid-cols-2">
        {SECTIONS.map((s, i) => (
          <section key={s.t} className="rounded-[24px] bg-graphite p-7">
            <p className="lab-label text-signal">{String(i + 1).padStart(2, "0")}</p>
            <h2 className="mt-3 text-2xl font-medium">{s.t}</h2>
            <ol className="mt-5 space-y-3">
              {s.steps.map((st, j) => (
                <li key={j} className="grid grid-cols-[1.75rem_1fr] text-ash">
                  <span className="font-mono text-smoke">{j + 1}.</span>
                  {st}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </>
  );
}
