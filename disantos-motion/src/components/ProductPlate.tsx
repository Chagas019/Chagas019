import { AbsoluteFill, Img, staticFile } from "remotion";
import { FabricPlate } from "./FabricPlate";
import { hasProduct, PRODUCT_SLOTS, type ProductSlot } from "../config/assets";

// Escolhe o primeiro slot que já tem arquivo real. Se nenhum tiver, usa o último
// da lista como quadro-reserva. Assim a cena "sobe" para a foto melhor disponível.
export const pickSlot = (...slots: ProductSlot[]): ProductSlot => {
  const found = slots.find((s) => hasProduct(s));
  return found ?? slots[slots.length - 1];
};

// Foto de produto em quadro cheio, com foco, zoom e escurecimento controlados pela cena.
// `focus` é o ponto de origem do zoom, em percentual (ex.: "48% 42%").
export const ProductPlate: React.FC<{
  slot: ProductSlot;
  scale?: number;
  translateX?: number;
  translateY?: number;
  focus?: string;
  dim?: number;
  blur?: number;
  fit?: "cover" | "contain";
}> = ({ slot, scale = 1, translateX = 0, translateY = 0, focus = "50% 50%", dim = 0, blur = 0, fit = "cover" }) => {
  const real = hasProduct(slot);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
          transformOrigin: focus,
          filter: blur > 0 ? `blur(${blur}px)` : undefined,
        }}
      >
        {real ? (
          <Img
            src={staticFile(PRODUCT_SLOTS[slot].file)}
            style={{ width: "100%", height: "100%", objectFit: fit, objectPosition: focus }}
          />
        ) : (
          <FabricPlate label={PRODUCT_SLOTS[slot].label} />
        )}
      </AbsoluteFill>
      {dim > 0 && <AbsoluteFill style={{ background: `rgba(3,4,6,${dim})` }} />}
    </AbsoluteFill>
  );
};
