import { expect, test } from "@playwright/test";
import { signUp, uniqueUser } from "./helpers";

test("Collab: publicar, candidatar-se, aceitar e liberar contato", async ({ browser }) => {
  const autor = uniqueUser("caio");
  const editora = uniqueUser("edi");
  const a = await (await browser.newContext()).newPage();
  await signUp(a, autor);
  await a.goto("/collab/nova");
  await a.getByLabel("Título").fill("Videomaker procura editor para clipe");
  await a.getByLabel("Descrição").fill("Clipe de 3 minutos com material já gravado.");
  await a.getByRole("group", { name: "Habilidades procuradas" }).getByRole("button", { name: "Edição de vídeo" }).click();
  await a.getByLabel("Remuneração").fill("R$ 1.200");
  await a.getByLabel("Contato").fill("caio@contato.test");
  await a.getByRole("button", { name: "Publicar oportunidade" }).click();
  await expect(a).toHaveURL(/\/collab\/[0-9a-f-]{36}/);
  const url = a.url();

  const b = await (await browser.newContext()).newPage();
  await signUp(b, editora);
  await b.goto("/collab");
  await b.getByRole("link", { name: /Videomaker procura editor para clipe/ }).first().click();
  await expect(b.getByText("caio@contato.test")).toHaveCount(0);
  await b.getByLabel("Por que você?").fill("Edito clipes há 4 anos, portfólio no perfil.");
  await b.getByRole("button", { name: "Tenho interesse" }).click();
  await expect(b.getByText("O contato aparece aqui se a candidatura for aceita.")).toBeVisible();

  await a.goto(url);
  await a.getByRole("button", { name: "Aceitar" }).click();
  await expect(a.getByText("Candidatura aceita.")).toBeVisible();

  await b.reload();
  await expect(b.getByText("Contato liberado")).toBeVisible();
  await expect(b.getByText("caio@contato.test")).toBeVisible();

  // Colaboração aceita libera mensagens diretas.
  await b.getByRole("link", { name: "Mandar mensagem no FRAME" }).click();
  await expect(b).toHaveURL(/\/mensagens\/nova/);
  await b.getByLabel("Mensagem").fill("Oi! Posso começar amanhã.");
  await b.getByRole("button", { name: "Enviar" }).click();
  await expect(b).toHaveURL(/\/mensagens\/[0-9a-f-]{36}/);
  await expect(b.getByText("Oi! Posso começar amanhã.")).toBeVisible();

  await a.goto("/mensagens");
  await expect(a.getByText("Oi! Posso começar amanhã.")).toBeVisible();
  await a.getByText("Oi! Posso começar amanhã.").click();
  await a.getByLabel("Mensagem").fill("Perfeito, te mando o material.");
  await a.getByRole("button", { name: "Enviar" }).click();
  await expect(a.getByText("Perfeito, te mando o material.")).toBeVisible();
  // A outra pessoa recebe pela atualização periódica, sem recarregar.
  await expect(b.getByText("Perfeito, te mando o material.")).toBeVisible({ timeout: 15_000 });
});
