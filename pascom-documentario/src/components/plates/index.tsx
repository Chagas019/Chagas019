import React from "react";
import { PlateKind } from "../../data/timeline";
import { BokehPlate } from "./BokehPlate";
import { CandlesPlate } from "./CandlesPlate";
import { ContactSheetPlate } from "./ContactSheetPlate";
import { DoorPlate } from "./DoorPlate";
import { LensPlate } from "./LensPlate";
import { NavePlate } from "./NavePlate";
import { ProcessionPlate } from "./ProcessionPlate";
import { StainedGlassPlate } from "./StainedGlassPlate";
import { PlateProps } from "./util";
import { ViewfinderPlate } from "./ViewfinderPlate";

const Black: React.FC<PlateProps> = () => null;

export const PLATES: Record<PlateKind, React.FC<PlateProps>> = {
  black: Black,
  door: DoorPlate,
  stainedGlass: StainedGlassPlate,
  lens: LensPlate,
  viewfinder: ViewfinderPlate,
  candles: CandlesPlate,
  bokeh: BokehPlate,
  procession: ProcessionPlate,
  contactSheet: ContactSheetPlate,
  nave: NavePlate,
};
