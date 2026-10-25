import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, MathUtils } from 'three';
import { Float, Sparkles, MeshDistortMaterial } from '@react-three/drei';

export const DragonCore = () => {
  const meshRef = useRef<Mesh>(null);
  const outerMeshRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Rotate inner core
      meshRef.current.rotation.y += 0.005;
      meshRef.current.rotation.x += 0.002;

      // Breathing scale effect
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      meshRef.current.scale.set(scale, scale, scale);
    }

    if (outerMeshRef.current) {
      // Rotate outer shell opposite direction
      outerMeshRef.current.rotation.y -= 0.003;
      outerMeshRef.current.rotation.z += 0.001;

      // Follow mouse slightly (parallax)
      const targetX = (state.pointer.x * Math.PI) / 8;
      const targetY = (state.pointer.y * Math.PI) / 8;

      outerMeshRef.current.rotation.x = MathUtils.lerp(outerMeshRef.current.rotation.x, -targetY, 0.1);
      outerMeshRef.current.rotation.y = MathUtils.lerp(outerMeshRef.current.rotation.y, targetX, 0.1);
    }
  });

  return (
    <group>
      <Float speed={2} rotationIntensity={1} floatIntensity={2}>
        {/* Inner intense core */}
        <mesh ref={meshRef}>
          <icosahedronGeometry args={[1.5, 4]} />
          <MeshDistortMaterial
            color="#8B0000" // Dark Red
            emissive="#ff3300"
            emissiveIntensity={2}
            distort={0.4}
            speed={3}
            roughness={0.2}
            metalness={0.8}
            wireframe={true}
          />
        </mesh>

        {/* Outer ethereal shell */}
        <mesh ref={outerMeshRef}>
          <icosahedronGeometry args={[2.2, 3]} />
          <MeshDistortMaterial
            color="#4B0082" // Indigo/Purple
            emissive="#110033"
            emissiveIntensity={0.5}
            distort={0.2}
            speed={1.5}
            roughness={0.4}
            metalness={0.9}
            transparent={true}
            opacity={0.6}
          />
        </mesh>

        {/* Ambient particles (fire/embers) */}
        <Sparkles
          count={150}
          scale={8}
          size={4}
          speed={0.4}
          opacity={0.8}
          color="#ffaa00"
        />

        {/* Dark smoke/magic particles */}
        <Sparkles
          count={100}
          scale={10}
          size={6}
          speed={0.2}
          opacity={0.4}
          color="#4B0082"
        />
      </Float>
    </group>
  );
};
