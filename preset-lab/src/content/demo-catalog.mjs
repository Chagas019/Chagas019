// Catálogo de DEMONSTRAÇÃO do PRESET LAB.
// Todos os produtos são fictícios e marcados com is_demo = true. As imagens são geradas
// localmente por scripts/generate-assets.mjs (sem imagens de terceiros).
// Usado pelo gerador de assets, pela semente do modo local e pela semente SQL do Supabase.

export const DEMO_CATEGORIES = [
  { slug: "cinematic", name: "Cinematic", description: "Contraste de cinema, sombras frias e altas luzes quentes.", scene: "neon", kind: "style" },
  { slug: "vintage", name: "Vintage", description: "Filme analógico, pretos lavados e grão orgânico.", scene: "road", kind: "style" },
  { slug: "editorial", name: "Editorial", description: "Cor contida, contraste firme, cara de revista.", scene: "concrete", kind: "style" },
  { slug: "clean", name: "Clean", description: "Luz aberta, branco honesto, pele natural.", scene: "bloom", kind: "style" },
  { slug: "moody", name: "Moody", description: "Tons baixos, verdes profundos, atmosfera densa.", scene: "forest", kind: "style" },
  { slug: "portrait", name: "Portrait", description: "Pele bonita e luz que valoriza o rosto.", scene: "portrait", kind: "subject" },
  { slug: "landscape", name: "Landscape", description: "Céus, horizontes e paisagens amplas.", scene: "alpine", kind: "subject" },
  { slug: "street", name: "Street", description: "Cidade, noite e o acaso da rua.", scene: "skyline", kind: "subject" },
  { slug: "wedding", name: "Wedding", description: "Delicadeza e calor para dias importantes.", scene: "wedding", kind: "subject" },
  { slug: "mobile", name: "Mobile Photography", description: "Ajustado para fotos de celular e Lightroom Mobile.", scene: "tropic", kind: "subject" },
];

const FORMATS = ["XMP", "ZIP"];
const APPS = ["Lightroom Mobile", "Lightroom Classic", "Lightroom (desktop)", "Camera Raw"];

export const DEMO_PRODUCTS = [
  { slug: "golden-dunes", name: "Golden Dunes", type: "free", price: 0, category: "landscape", tags: ["landscape", "mobile"], scene: "dunes", grade: "warm", gallery: ["tropic", "road"], featured: true, palette: ["#F3B46B", "#D9773D", "#9E4A20", "#6F3416"], short: "Calor de fim de tarde sem estourar o céu." },
  { slug: "clean-daylight", name: "Clean Daylight", type: "free", price: 0, category: "clean", tags: ["clean", "mobile", "portrait"], scene: "concrete", grade: "clean", gallery: ["bloom"], featured: false, palette: ["#F6F8FB", "#D8D3CB", "#9EC5E8", "#3E3A35"], short: "Branco honesto e sombras abertas para o dia a dia." },
  { slug: "street-mono", name: "Street Mono", type: "free", price: 0, category: "street", tags: ["street", "editorial"], scene: "skyline", grade: "mono", gallery: ["neon", "concrete"], featured: true, palette: ["#F2F2F2", "#9A9A9A", "#3A3A3A", "#0D0D0D"], short: "Preto e branco de contraste duro para a rua." },
  { slug: "soft-bloom", name: "Soft Bloom", type: "free", price: 0, category: "mobile", tags: ["mobile", "clean"], scene: "bloom", grade: "clean", gallery: ["tropic"], featured: false, palette: ["#FBE3EE", "#F28DB2", "#FFD166", "#B5E48C"], short: "Cores suaves e pele luminosa para o celular." },
  { slug: "neon-noir", name: "Neon Noir", type: "premium", price: 2990, access: "purchase_or_subscription", category: "cinematic", tags: ["cinematic", "street"], scene: "neon", grade: "cinematic", gallery: ["skyline", "ocean"], featured: true, palette: ["#2DE2E6", "#FF3D7F", "#FF7A18", "#05060C"], short: "Noite de cinema: ciano nas sombras, neon que vibra." },
  { slug: "teal-coast", name: "Teal Coast", type: "premium", price: 2490, access: "purchase_or_subscription", category: "cinematic", tags: ["cinematic", "landscape"], scene: "ocean", grade: "cinematic", gallery: ["tropic", "lake"], featured: true, palette: ["#1C2A4A", "#3D4F73", "#F4B27A", "#FFE3B0"], short: "O clássico teal & orange, calibrado para mar e céu." },
  { slug: "film-1978", name: "Film 1978", type: "premium", price: 1990, access: "purchase_or_subscription", category: "vintage", tags: ["vintage", "landscape", "mobile"], scene: "road", grade: "vintage", gallery: ["dunes", "still"], featured: false, palette: ["#E9D6B0", "#C98A55", "#6D4426", "#5E88B8"], short: "Pretos lavados e grão de filme de estrada." },
  { slug: "fog-ritual", name: "Fog Ritual", type: "premium", price: 2290, access: "subscription_only", category: "moody", tags: ["moody", "landscape"], scene: "forest", grade: "moody", gallery: ["alpine", "lake"], featured: false, palette: ["#DFE8E1", "#6F8A78", "#3F5A49", "#16231A"], short: "Verdes densos e névoa — exclusivo do Premium Club." },
  { slug: "window-light", name: "Window Light", type: "premium", price: 2790, access: "purchase_or_subscription", category: "portrait", tags: ["portrait", "editorial"], scene: "portrait", grade: "editorial", gallery: ["still"], featured: true, palette: ["#F3C9A2", "#A9694A", "#6A4A3A", "#140D0B"], short: "Pele com textura e sombra esculpida pela janela." },
  { slug: "golden-vows", name: "Golden Vows", type: "premium", price: 3990, access: "purchase_only", category: "wedding", tags: ["wedding", "portrait"], scene: "wedding", grade: "warm", gallery: ["bloom", "dunes"], featured: true, palette: ["#FBF6EE", "#F7D7A8", "#E9B984", "#7B5A3C"], short: "Pacote de casamento: dourado delicado, brancos limpos." },
  { slug: "nordic-lake", name: "Nordic Lake", type: "premium", price: 2190, access: "subscription_only", category: "landscape", tags: ["landscape", "moody", "clean"], scene: "lake", grade: "moody", gallery: ["alpine"], featured: false, palette: ["#CFE2E6", "#7FA2A2", "#4F6E6A", "#2C4541"], short: "Frio nórdico e reflexos calmos — exclusivo do Premium Club." },
  { slug: "concrete-editorial", name: "Concrete Editorial", type: "premium", price: 2490, access: "purchase_or_subscription", category: "editorial", tags: ["editorial", "street"], scene: "concrete", grade: "editorial", gallery: ["skyline", "still"], featured: false, palette: ["#E6EEF5", "#D8D3CB", "#8D877D", "#3E3A35"], short: "Arquitetura com cara de revista: contraste e cor contida." },
].map((p) => ({
  ...p,
  access: p.access ?? "free",
  formats: FORMATS,
  compatibility: APPS,
  creator: { name: "PRESET LAB Studio", handle: "@presetlab", bio: "Estúdio interno do PRESET LAB. Produtos de demonstração criados para apresentar a plataforma." },
  description: `${p.short}\n\nProduto de demonstração do PRESET LAB. O arquivo é um preset real do Lightroom (formato XMP), gerado para apresentar a plataforma — teste à vontade nas suas fotos.\n\nFunciona melhor em fotos bem expostas; ajuste exposição e temperatura depois de aplicar.`,
}));

export const DEMO_COLLECTIONS = [
  { slug: "cidade-a-noite", title: "Cidade à Noite", description: "Neon, concreto e preto e branco para fotografar a rua depois que o sol vai embora.", scene: "neon", premium: false, price: null, products: ["neon-noir", "street-mono", "concrete-editorial"] },
  { slug: "luz-dourada", title: "Luz Dourada", description: "Quatro presets para a hora dourada — vendidos juntos com desconto.", scene: "dunes", premium: false, price: 5990, products: ["golden-dunes", "teal-coast", "film-1978", "golden-vows"] },
  { slug: "natureza-silenciosa", title: "Natureza Silenciosa", description: "Coleção exclusiva do Premium Club: névoa, lagos e montanhas.", scene: "lake", premium: true, price: null, products: ["fog-ritual", "nordic-lake", "golden-dunes"] },
];

export const DEMO_INSPIRATION = [
  { slug: "azul-de-cinema", title: "Azul de cinema", style: "Cinematic", scene: "ocean", grade: "cinematic", palette: ["#1C2A4A", "#3D4F73", "#F4B27A", "#FFE3B0"], description: "Horizonte no limite da luz. Sombras puxadas para o ciano, sol preservado.", products: ["teal-coast", "neon-noir"] },
  { slug: "rua-molhada", title: "Rua molhada", style: "Cinematic / Street", scene: "neon", grade: "cinematic", palette: ["#05060C", "#2DE2E6", "#FF3D7F", "#FF7A18"], description: "Reflexos de neon no asfalto. O preto precisa ser preto de verdade.", products: ["neon-noir", "street-mono"] },
  { slug: "estrada-1978", title: "Estrada, 1978", style: "Vintage", scene: "road", grade: "vintage", palette: ["#E9D6B0", "#C98A55", "#6D4426", "#5E88B8"], description: "Pretos lavados e céu desbotado, como uma cópia guardada na gaveta.", products: ["film-1978"] },
  { slug: "nevoa", title: "Névoa", style: "Moody", scene: "forest", grade: "moody", palette: ["#DFE8E1", "#6F8A78", "#3F5A49", "#16231A"], description: "Camadas de árvores sumindo na névoa. Pouca cor, muita atmosfera.", products: ["fog-ritual", "nordic-lake"] },
  { slug: "janela-norte", title: "Janela norte", style: "Portrait / Editorial", scene: "portrait", grade: "editorial", palette: ["#F3C9A2", "#A9694A", "#6A4A3A", "#140D0B"], description: "Uma janela, um rosto. Sombra esculpida e pele com textura.", products: ["window-light"] },
  { slug: "concreto", title: "Concreto", style: "Editorial", scene: "concrete", grade: "editorial", palette: ["#E6EEF5", "#D8D3CB", "#8D877D", "#3E3A35"], description: "Geometria e sombra dura. Cor contida para deixar a forma falar.", products: ["concrete-editorial", "clean-daylight"] },
  { slug: "duna", title: "Duna", style: "Landscape", scene: "dunes", grade: "warm", palette: ["#F3B46B", "#D9773D", "#9E4A20", "#6F3416"], description: "Curvas de areia em camadas de laranja. Calor sem estourar.", products: ["golden-dunes", "golden-vows"] },
  { slug: "natureza-morta", title: "Natureza-morta", style: "Editorial / Moody", scene: "still", grade: "moody", palette: ["#5A4A3E", "#D0622B", "#E9E2D6", "#0F0C0A"], description: "Luz única de estúdio sobre formas simples.", products: ["window-light", "film-1978"] },
];

export const DEMO_BANNERS = [
  { title: "Your creative space for photo editing.", subtitle: "Presets de Lightroom criados como peças de estúdio. Baixe grátis, compre avulso ou entre para o Premium Club.", image: "/demo/scenes/neon-wide.webp", link: "/presets", label: "Explorar presets", position: 1 },
];
