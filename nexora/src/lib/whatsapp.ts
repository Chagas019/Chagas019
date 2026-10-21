/** Link do WhatsApp. Sem número configurado, abre o WhatsApp com a mensagem pronta para a pessoa escolher o contato. */
export function whatsappLink(number: string, text: string) {
  const digits = number.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
