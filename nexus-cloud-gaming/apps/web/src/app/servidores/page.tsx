import { DeviceCheck } from '@/components/DeviceCheck';
import { PageHeader, Section } from '@/components/Section';
import { ServerRegions } from '@/components/ServerRegions';
import { ServiceStatus } from '@/components/ServiceStatus';

export const metadata = { title: 'Servidores e diagnóstico' };

export default function ServersPage() {
  return (
    <>
      <PageHeader eyebrow="Servidores" title="Status e diagnóstico">
        Estado real de cada parte da plataforma e um diagnóstico dos recursos do seu aparelho. A latência mostrada é até o
        servidor web; a latência até um servidor de jogo só existirá na Fase 4.
      </PageHeader>
      <Section id="status" eyebrow="Agora" title="Estado do serviço">
        <ServiceStatus />
      </Section>
      <Section id="regioes" eyebrow="Plano de implantação" title="Regiões">
        <ServerRegions />
      </Section>
      <Section id="aparelho" eyebrow="Seu aparelho" title="Recursos do navegador" description="Detectados agora, direto no navegador. Nada é enviado ao servidor.">
        <DeviceCheck />
      </Section>
    </>
  );
}
