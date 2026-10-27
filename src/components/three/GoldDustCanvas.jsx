"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";

function GoldDust({ color }) {
  const pointsRef = useRef(null);
  const positions = useMemo(() => {
    const values = new Float32Array(72 * 3);
    for (let index = 0; index < 72; index += 1) {
      const angle = index * 2.399;
      const radius = 0.35 + ((index * 37) % 100) / 100;
      values[index * 3] = Math.cos(angle) * radius * 1.3;
      values[index * 3 + 1] = ((index * 53) % 100) / 50 - 1;
      values[index * 3 + 2] = Math.sin(angle) * radius * 0.3;
    }
    return values;
  }, []);

  useFrame((_, delta) => {
    if (pointsRef.current && document.visibilityState === "visible") {
      pointsRef.current.rotation.y += delta * 0.025;
      pointsRef.current.rotation.x = Math.sin(performance.now() * 0.00012) * 0.035;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.018} sizeAttenuation transparent opacity={0.68} depthWrite={false} />
    </points>
  );
}

export default function GoldDustCanvas() {
  const [gold] = useState(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--gold-light").trim(),
  );

  if (!gold) return null;

  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 46 }}
      dpr={[1, 1.25]}
      gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
      aria-hidden="true"
    >
      <GoldDust color={gold} />
    </Canvas>
  );
}
