import { Plans } from '@/components/Plans';
import { PageHeader, Section } from '@/components/Section';

export const metadata = { title: 'Planos' };

export default function PlansPage() {
  return (
    <>
      <PageHeader eyebrow="Assinatura" title="Planos">
        A estrutura dos planos já está pronta para receber um meio de pagamento. Preços só serão publicados depois de
        medir o custo real de GPU por hora de sessão; nenhuma cobrança é feita nesta prévia.
      </PageHeader>
      <Section id="lista" title="Compare">
        <Plans />
      </Section>
    </>
  );
}
