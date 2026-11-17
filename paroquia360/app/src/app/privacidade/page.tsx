export const metadata = { title: 'Privacidade' };

export default function Privacidade() {
  return (
    <main className="auth">
      <article className="auth-card" style={{ width: 'min(680px,100%)' }}>
        <h1>Política de privacidade</h1>
        <p><b>Rascunho para revisão jurídica da paróquia antes do uso em produção.</b></p>
        <div className="stack muted" style={{ lineHeight: 1.6 }}>
          <p>O Paróquia360 guarda apenas o necessário para organizar a vida paroquial: nome, e-mail, telefone (opcional), data de nascimento (para proteger menores), pastorais, disponibilidade e participação em escalas.</p>
          <p>Cada paróquia só acessa os dados das pessoas vinculadas a ela. Telefone e data de nascimento ficam visíveis apenas para a administração da paróquia e a coordenação da sua pastoral.</p>
          <p>Menores de 18 anos só participam de escalas com consentimento registrado do responsável, e aparecem para outros voluntários apenas pelo primeiro nome.</p>
          <p>Ações administrativas ficam registradas. Você pode pedir à administração da sua paróquia a correção ou exclusão dos seus dados.</p>
        </div>
      </article>
    </main>
  );
}
