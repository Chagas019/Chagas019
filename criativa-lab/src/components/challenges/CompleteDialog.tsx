"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/lib/store";

export function CompleteDialog({
  open,
  onClose,
  slug,
  step = null,
  title,
  xp,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  step?: number | null;
  title: string;
  xp: number;
}) {
  const { completeChallenge } = useApp();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await completeChallenge(slug, note, step);
      setNote("");
      onClose();
    } catch {
      /* toast já exibido */
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Registrar conclusão">
      <form onSubmit={submit} className="space-y-5">
        <p className="text-sm text-fog">
          <span className="text-paper">{title}</span> · você vai ganhar <strong className="text-lime">+{xp} XP</strong>.
        </p>
        <div>
          <label htmlFor="note" className="mb-2 block text-sm text-fog">
            O que você aprendeu? <span className="text-mute">(opcional)</span>
          </label>
          <textarea
            id="note"
            rows={4}
            className="field resize-none"
            maxLength={600}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: a luz lateral deixou o retrato muito mais dramático…"
          />
          <p className="mt-1 text-right text-[11px] text-mute">{note.length}/600</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            <Check className="size-4" /> Concluir desafio
          </Button>
        </div>
      </form>
    </Modal>
  );
}
