import type { Locale } from "@/types/database";

/** Conteúdo jurídico preliminar por idioma (sem mistura de idiomas na mesma página). */
export interface LegalDoc { intro: string; sections: Array<{ title: string; items?: string[]; body?: string }> }

export const terms: Record<Locale, LegalDoc> = {
  "pt-BR": {
    intro: "A KOINONIA é uma plataforma gratuita que conecta voluntários, paróquias, comunidades e movimentos católicos para colaboração, partilha de talentos e de recursos.",
    sections: [
      { title: "1. Uso da plataforma", items: ["Você deve fornecer informações verdadeiras e manter sua senha em sigilo.", "Comunidades só publicam oportunidades depois de verificadas pela equipe da KOINONIA.", "É proibido usar a plataforma para fins comerciais, político-partidários, spam, assédio ou qualquer atividade ilegal."] },
      { title: "2. Voluntariado", body: "As colaborações são acordadas diretamente entre voluntários e comunidades. A KOINONIA não é empregadora nem intermediária financeira e não cobra por nenhum serviço." },
      { title: "3. Conteúdo e moderação", body: "Qualquer pessoa pode denunciar perfis, comunidades ou oportunidades. A moderação pode remover conteúdo e suspender contas que violem estes termos." },
      { title: "4. Encerramento", body: "Você pode excluir sua conta a qualquer momento na página Conta; seus dados são removidos conforme a Política de Privacidade." },
    ],
  },
  en: {
    intro: "KOINONIA is a free platform that connects volunteers, parishes, communities and Catholic movements to collaborate and share talents and resources.",
    sections: [
      { title: "1. Using the platform", items: ["You must provide truthful information and keep your password secret.", "Communities can only publish opportunities after being verified by the KOINONIA team.", "Using the platform for commercial or partisan purposes, spam, harassment or any illegal activity is prohibited."] },
      { title: "2. Volunteering", body: "Collaborations are agreed directly between volunteers and communities. KOINONIA is neither an employer nor a financial intermediary and charges nothing for any service." },
      { title: "3. Content and moderation", body: "Anyone can report profiles, communities or opportunities. Moderators may remove content and suspend accounts that violate these terms." },
      { title: "4. Closing your account", body: "You can delete your account at any time on the Account page; your data is removed as described in the Privacy Policy." },
    ],
  },
  es: {
    intro: "KOINONIA es una plataforma gratuita que conecta voluntarios, parroquias, comunidades y movimientos católicos para colaborar y compartir talentos y recursos.",
    sections: [
      { title: "1. Uso de la plataforma", items: ["Debes proporcionar información veraz y mantener tu contraseña en secreto.", "Las comunidades solo publican oportunidades después de ser verificadas por el equipo de KOINONIA.", "Está prohibido usar la plataforma con fines comerciales, político-partidistas, spam, acoso o cualquier actividad ilegal."] },
      { title: "2. Voluntariado", body: "Las colaboraciones se acuerdan directamente entre voluntarios y comunidades. KOINONIA no es empleadora ni intermediaria financiera y no cobra por ningún servicio." },
      { title: "3. Contenido y moderación", body: "Cualquier persona puede denunciar perfiles, comunidades u oportunidades. La moderación puede eliminar contenido y suspender cuentas que infrinjan estos términos." },
      { title: "4. Cierre de la cuenta", body: "Puedes eliminar tu cuenta en cualquier momento en la página Cuenta; tus datos se eliminan según la Política de Privacidad." },
    ],
  },
};

export const privacy: Record<Locale, LegalDoc> = {
  "pt-BR": {
    intro: "Tratamos seus dados com base no consentimento e na execução do serviço, em conformidade com a LGPD (Brasil) e o GDPR (União Europeia).",
    sections: [
      { title: "Dados que coletamos", items: ["Conta: e-mail e senha (armazenada apenas como hash pelo provedor de autenticação).", "Perfil: nome, biografia, país, cidade, idiomas, disponibilidade, modalidade, talentos e portfólio — você escolhe se o perfil é público, visível a membros ou privado.", "Contatos privados (telefone e e-mail de contato): visíveis somente para você.", "Atividade: candidaturas, mensagens, avaliações e denúncias necessárias ao serviço."] },
      { title: "Como protegemos", items: ["Controle de acesso por linha no banco de dados (Row Level Security) em todas as tabelas.", "Criptografia em trânsito (HTTPS) e cabeçalhos de segurança.", "Registro de auditoria para ações administrativas."] },
      { title: "Seus direitos", body: "Você pode acessar, corrigir, exportar (página Conta → Exportar meus dados) ou excluir seus dados e revogar o consentimento a qualquer momento." },
      { title: "Compartilhamento", body: "Não vendemos dados e não exibimos anúncios. Dados só são compartilhados com os provedores de infraestrutura necessários (hospedagem e banco de dados)." },
    ],
  },
  en: {
    intro: "We process your data based on consent and on providing the service, in line with LGPD (Brazil) and GDPR (European Union).",
    sections: [
      { title: "Data we collect", items: ["Account: email and password (stored only as a hash by the authentication provider).", "Profile: name, bio, country, city, languages, availability, service mode, talents and portfolio — you choose whether it is public, members-only or private.", "Private contacts (phone and contact email): visible only to you.", "Activity: applications, messages, reviews and reports needed to run the service."] },
      { title: "How we protect it", items: ["Row Level Security on every database table.", "Encryption in transit (HTTPS) and security headers.", "Audit log for administrative actions."] },
      { title: "Your rights", body: "You can access, correct, export (Account page → Download my data) or delete your data and withdraw consent at any time." },
      { title: "Sharing", body: "We do not sell data or show ads. Data is only shared with the infrastructure providers we need (hosting and database)." },
    ],
  },
  es: {
    intro: "Tratamos tus datos con base en el consentimiento y en la prestación del servicio, conforme a la LGPD (Brasil) y al RGPD (Unión Europea).",
    sections: [
      { title: "Datos que recopilamos", items: ["Cuenta: correo y contraseña (almacenada solo como hash por el proveedor de autenticación).", "Perfil: nombre, biografía, país, ciudad, idiomas, disponibilidad, modalidad, talentos y portafolio — eliges si es público, solo para miembros o privado.", "Contactos privados (teléfono y correo de contacto): visibles solo para ti.", "Actividad: postulaciones, mensajes, reseñas y denuncias necesarias para el servicio."] },
      { title: "Cómo lo protegemos", items: ["Seguridad a nivel de fila (Row Level Security) en todas las tablas.", "Cifrado en tránsito (HTTPS) y cabeceras de seguridad.", "Registro de auditoría de acciones administrativas."] },
      { title: "Tus derechos", body: "Puedes acceder, corregir, exportar (página Cuenta → Descargar mis datos) o eliminar tus datos y retirar el consentimiento en cualquier momento." },
      { title: "Compartir", body: "No vendemos datos ni mostramos anuncios. Los datos solo se comparten con los proveedores de infraestructura necesarios (alojamiento y base de datos)." },
    ],
  },
};
