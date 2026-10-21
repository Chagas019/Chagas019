import { Environment, Lightformer, Sky } from '@react-three/drei';
import type { Model3D } from '@/types/property';

/** Luz do dia (sol + céu) ou da noite (luzes internas nos ambientes) */
export function LightingControls({ night, rooms }: { night: boolean; rooms: Model3D['rooms'] }) {
  return (
    <>
      {!night && <Sky distance={4500} sunPosition={[-60, 40, -80]} turbidity={4} rayleigh={1.2} mieCoefficient={0.004} />}
      <hemisphereLight args={[night ? '#3a4a7a' : '#dbe8ff', night ? '#0b0f18' : '#4a4636', night ? 0.25 : 0.6]} />
      <directionalLight
        position={night ? [30, 40, 20] : [-30, 45, -40]}
        intensity={night ? 0.15 : 2.6}
        color={night ? '#8fa8ff' : '#fff4e6'}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
      />
      {night && Object.entries(rooms).filter(([, r]) => r.interior).map(([id, r]) => (
        <pointLight key={id} position={[r.target[0], r.target[1] + 1.4, r.target[2]]} color="#ffcf94" intensity={14} distance={9} decay={1.6} />
      ))}
      <Environment resolution={128} environmentIntensity={night ? 0.15 : 0.8}>
        <Lightformer intensity={2} position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[40, 40, 1]} color="#ffffff" />
        <Lightformer intensity={1} position={[-20, 4, -10]} scale={[30, 8, 1]} color="#cfe0ff" />
        <Lightformer intensity={0.6} position={[20, 2, 10]} scale={[30, 6, 1]} color="#ffe2c4" />
      </Environment>
    </>
  );
}

