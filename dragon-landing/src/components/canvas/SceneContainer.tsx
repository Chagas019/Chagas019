import { Canvas } from '@react-three/fiber';
import { Environment, CameraControls, ContactShadows } from '@react-three/drei';
import { DragonCore } from './DragonCore';
import { Suspense, useRef } from 'react';

interface SceneContainerProps {
  interactive?: boolean;
}

export const SceneContainer = ({ interactive = false }: SceneContainerProps) => {
  const cameraControlsRef = useRef<any>(null);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        className={`w-full h-full ${interactive ? 'pointer-events-auto' : ''}`}
        dpr={[1, 2]} // Performance optimization for mobile
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.2} color="#4B0082" />
          <directionalLight position={[10, 10, 5]} intensity={2} color="#8B0000" />
          <directionalLight position={[-10, -10, -5]} intensity={1} color="#000080" />
          <pointLight position={[0, 0, 0]} intensity={5} color="#ff3300" distance={10} />

          <DragonCore />

          {/* Environmental reflections */}
          <Environment preset="night" />

          {/* Floor shadow */}
          <ContactShadows
            position={[0, -3.5, 0]}
            opacity={0.7}
            scale={20}
            blur={2.5}
            far={10}
            color="#000000"
          />

          {interactive && (
            <CameraControls
              ref={cameraControlsRef}
              mouseButtons={{ left: 1, middle: 0, right: 0, wheel: 0 }}
              touches={{ one: 32, two: 0, three: 0 }}
              maxPolarAngle={Math.PI / 1.5}
              minPolarAngle={Math.PI / 3}
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
};
