"use client"

import { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Float, RoundedBox, Text } from "@react-three/drei"
import * as THREE from "three"

function CreditCard({ balance }: { balance: number }) {
  const cardRef = useRef<THREE.Group>(null)
  
  useFrame((state) => {
    if (cardRef.current) {
      cardRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.15
      cardRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.2) * 0.05
    }
  })

  const balanceText = useMemo(() => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(balance)
  }, [balance])

  return (
    <Float speed={2} rotationIntensity={0.3} floatIntensity={0.5}>
      <group ref={cardRef}>
        {/* Card body */}
        <RoundedBox args={[4, 2.5, 0.15]} radius={0.15} smoothness={4}>
          <meshStandardMaterial
            color="#1e293b"
            metalness={0.8}
            roughness={0.2}
          />
        </RoundedBox>

        {/* Gradient overlay */}
        <RoundedBox args={[4, 2.5, 0.16]} radius={0.15} smoothness={4}>
          <meshStandardMaterial
            color="#3b82f6"
            transparent
            opacity={0.3}
            metalness={0.9}
            roughness={0.1}
          />
        </RoundedBox>

        {/* Balance text */}
        <Text
          position={[-1.5, 0.5, 0.09]}
          fontSize={0.2}
          color="#94a3b8"
          anchorX="left"
        >
          Balance Total
        </Text>

        <Text
          position={[-1.5, 0.1, 0.09]}
          fontSize={0.35}
          color="#f0f4ff"
          anchorX="left"
        >
          {balanceText}
        </Text>

        {/* Card details */}
        <Text
          position={[-1.5, -0.8, 0.09]}
          fontSize={0.15}
          color="#cbd5e1"
          anchorX="left"
        >
          David López
        </Text>

        <Text
          position={[1.5, -0.8, 0.09]}
          fontSize={0.15}
          color="#cbd5e1"
          anchorX="right"
        >
          •••• 1234
        </Text>

        {/* Chip */}
        <RoundedBox args={[0.4, 0.3, 0.08]} radius={0.05} position={[-1.3, -0.3, 0.09]}>
          <meshStandardMaterial
            color="#fbbf24"
            metalness={0.9}
            roughness={0.1}
          />
        </RoundedBox>

        {/* Accent glow */}
        <pointLight position={[0, 0, 1]} intensity={0.5} color="#3b82f6" distance={5} />
      </group>
    </Float>
  )
}

export default function Hero3D({ totalBalance }: { totalBalance: number }) {
  return (
    <div className="relative w-full h-[500px] bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 rounded-2xl overflow-hidden">
      {/* Background gradient mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-600/20 via-transparent to-transparent" />
      
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.3} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={0.5} />
        <CreditCard balance={totalBalance} />
      </Canvas>

      {/* Overlay text */}
      <div className="absolute bottom-8 left-8 z-10">
        <h1 className="text-4xl font-bold text-white mb-2">Tu Banco Personal</h1>
        <p className="text-slate-300">Controla tus finanzas en un solo lugar</p>
      </div>
    </div>
  )
}
