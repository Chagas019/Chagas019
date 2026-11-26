import { Composition, AbsoluteFill } from "remotion";
import { loadFont } from "@remotion/google-fonts/Unbounded";
const { fontFamily } = loadFont();
const T = () => <AbsoluteFill style={{background:"#0B2A8F",color:"#fff",fontFamily,fontSize:120,fontWeight:900,justifyContent:"center",alignItems:"center"}}>PAFIES</AbsoluteFill>;
export const RemotionRoot = () => <Composition id="PafiesMain" component={T} durationInFrames={90} fps={30} width={1920} height={1080} />;
