// Formulário de contato sem servidor (o site vai para o GitHub Pages).
// Monta a mensagem e abre o canal que estiver configurado abaixo:
//   1. WhatsApp, se tiver número   2. e-mail, se tiver endereço
//   3. senão, copia a mensagem e abre o direct do Instagram
export const CONTATO = {
  whatsapp: '',          // só números, com DDI e DDD. Ex.: '5512999999999'
  email: '',             // ex.: 'contato@seudominio.com'
  instagram: 'caue_gabriiel',
};

export function initForm() {
  const form = document.querySelector('[data-form]');
  if (!form) return;
  const status = form.querySelector('[data-form-status]');

  form.addEventListener('input', (e) => e.target.closest('.field')?.classList.remove('is-error'));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const vazios = ['nome', 'contato', 'mensagem'].filter((k) => !String(data[k] || '').trim());
    form.querySelectorAll('.field').forEach((f) => f.classList.remove('is-error'));
    if (vazios.length) {
      vazios.forEach((k) => form.elements[k].closest('.field').classList.add('is-error'));
      form.elements[vazios[0]].focus();
      status.textContent = vazios.length === 1 ? 'Faltou preencher um campo.' : `Faltou preencher ${vazios.length} campos.`;
      return;
    }

    const texto = `Olá, Cauê! Meu nome é ${data.nome.trim()} (${data.contato.trim()}).\n\n${data.mensagem.trim()}`;

    if (CONTATO.whatsapp) {
      window.open(`https://wa.me/${CONTATO.whatsapp}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
      status.textContent = 'Abri o WhatsApp com a sua mensagem. É só enviar.';
    } else if (CONTATO.email) {
      const assunto = encodeURIComponent(`Pedido de orçamento: ${data.nome.trim()}`);
      window.location.href = `mailto:${CONTATO.email}?subject=${assunto}&body=${encodeURIComponent(texto)}`;
      status.textContent = 'Abri o seu e-mail com a mensagem pronta.';
    } else {
      // copia antes de abrir a aba (a cópia precisa da página em foco)
      const copia = navigator.clipboard?.writeText(texto) ?? Promise.reject();
      window.open(`https://ig.me/m/${CONTATO.instagram}`, '_blank', 'noopener');
      copia
        .then(() => { status.textContent = 'Copiei a sua mensagem. Cole no direct do Instagram que abriu em outra aba.'; })
        .catch(() => { status.textContent = 'Abri o direct do Instagram. Copie a sua mensagem e mande por lá.'; });
    }
  });
}
