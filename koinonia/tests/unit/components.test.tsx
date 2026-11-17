import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import { Field, Input, ChoiceGroup } from "@/components/ui/field";
import { StatePanel } from "@/components/ui/state-panel";
import { Alert } from "@/components/ui/alert";

describe("Button", () => {
  it("fica desativado e anuncia carregamento", () => {
    render(<Button loading loadingLabel="Salvando">Salvar</Button>);
    const btn = screen.getByRole("button", { name: /salvar/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Salvando");
  });
  it("usa type=button por padrão (não envia formulários sem querer)", () => {
    render(<Button>Ok</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});

describe("Field", () => {
  it("associa rótulo, dica e erro ao controle", () => {
    render(
      <Field label="E-mail" hint="Seu melhor e-mail" error="E-mail inválido" required>
        {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} />}
      </Field>,
    );
    const input = screen.getByLabelText(/e-mail/i);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Seu melhor e-mail E-mail inválido");
  });
});

describe("ChoiceGroup", () => {
  it("renderiza opções nativas acessíveis dentro de um fieldset", () => {
    render(<ChoiceGroup legend="Idiomas" name="languages" options={[{ value: "pt", label: "Português" }, { value: "es", label: "Espanhol" }]} defaultValue={["es"]} />);
    expect(screen.getByRole("group", { name: "Idiomas" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Espanhol" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Português" })).not.toBeChecked();
  });
});

describe("Estados", () => {
  it("StatePanel de erro é anunciado como alerta", () => {
    render(<StatePanel variant="error" title="Falhou" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Falhou");
    expect(screen.getByRole("heading", { level: 2, name: "Falhou" })).toBeInTheDocument();
  });
  it("Alert com live=polite usa role=status", () => {
    render(<Alert tone="success" live="polite">Salvo</Alert>);
    expect(screen.getByRole("status")).toHaveTextContent("Salvo");
  });
});
