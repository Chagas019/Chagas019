import { ProductList } from "@/components/ProductList";
export default function Page() {
  return <ProductList title="Ofertas aprovadas" subtitle="Aprovadas pelo Scout (nota ≥ mínimo), em geração de copy ou prontas para publicar." fixedStates={["APPROVED", "COPY_GENERATED", "READY_TO_PUBLISH", "PUBLISHING"]} />;
}
