import { useRef, useMemo, type MutableRefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { EngineState } from '../types/engine'
import { STATE_META } from '../statusMeta'
import Engine3DErrorBoundary from './Engine3DErrorBoundary'

interface Props {
  rpm: number | null
  state: EngineState
}

const CYLINDER_COUNT = 4
const CRANK_RADIUS = 0.35
const ROD_LENGTH = 1.1
const PISTON_TRAVEL_TOP = 1.55

// Crank-slider kinematics: given crank angle theta, returns the piston's
// axial position. This is a simplified visual-only mechanical model, not a
// validated simulation.
function pistonPosition(theta: number): number {
  const r = CRANK_RADIUS
  const L = ROD_LENGTH
  return r * Math.cos(theta) + Math.sqrt(Math.max(L * L - r * r * Math.sin(theta) ** 2, 0))
}

function Piston({ index, angleOffset, crankAngleRef }: { index: number; angleOffset: number; crankAngleRef: MutableRefObject<number> }) {
  const pistonRef = useRef<THREE.Mesh>(null)
  const rodRef = useRef<THREE.Mesh>(null)
  const x = (index - (CYLINDER_COUNT - 1) / 2) * 0.9

  useFrame(() => {
    const theta = crankAngleRef.current + angleOffset
    const extension = pistonPosition(theta)
    const y = PISTON_TRAVEL_TOP - (ROD_LENGTH - (extension - CRANK_RADIUS))
    if (pistonRef.current) pistonRef.current.position.set(x, y, 0)
    if (rodRef.current) {
      const dy = y - 0.15
      rodRef.current.position.set(x, 0.15 + dy / 2, 0)
      rodRef.current.scale.set(1, dy / ROD_LENGTH, 1)
    }
  })

  return (
    <group>
      <mesh ref={pistonRef} position={[x, PISTON_TRAVEL_TOP, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.32, 20]} />
        <meshStandardMaterial color="#c7ced2" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh ref={rodRef} position={[x, 0.7, 0]}>
        <cylinderGeometry args={[0.07, 0.07, ROD_LENGTH, 12]} />
        <meshStandardMaterial color="#8b959c" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[x, 0, 0.55]}>
        <cylinderGeometry args={[0.34, 0.34, 1.9, 24, 1, true]} />
        <meshStandardMaterial color="#2a3238" metalness={0.3} roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function Crankshaft({ crankAngleRef }: { crankAngleRef: MutableRefObject<number> }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (ref.current) ref.current.rotation.z = -crankAngleRef.current
  })
  return (
    <group ref={ref} position={[0, 0.15, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 4.2, 16]} />
        <meshStandardMaterial color="#4fb3ac" metalness={0.7} roughness={0.25} />
      </mesh>
    </group>
  )
}

function EngineBlock({ stateColor }: { stateColor: string }) {
  return (
    <group>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[4.1, 1.9, 1.6]} />
        <meshStandardMaterial color="#1d242a" metalness={0.4} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.75, 0]}>
        <boxGeometry args={[4.2, 0.35, 1.7]} />
        <meshStandardMaterial color="#151a1e" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* Simulation-state indicator light on the valve cover */}
      <mesh position={[1.85, 1.95, 0]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color={stateColor} emissive={stateColor} emissiveIntensity={1.4} />
      </mesh>
    </group>
  )
}

function Rig({ rpm, state }: Props) {
  const crankAngleRef = useRef(0)
  const effectiveRpm = rpm && rpm > 0 ? rpm : 0

  useFrame((_, delta) => {
    const radiansPerSecond = (effectiveRpm / 60) * Math.PI * 2 * 0.35 // scaled for legible visual speed
    crankAngleRef.current += radiansPerSecond * delta
  })

  const angleOffsets = useMemo(
    () => Array.from({ length: CYLINDER_COUNT }, (_, i) => (i * Math.PI) / 2),
    [],
  )

  const stateColor = STATE_META[state]?.color ?? '#6b7378'

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 5]} intensity={1.1} />
      <directionalLight position={[-4, 2, -3]} intensity={0.35} />
      <EngineBlock stateColor={stateColor} />
      <Crankshaft crankAngleRef={crankAngleRef} />
      {angleOffsets.map((offset, i) => (
        <Piston key={i} index={i} angleOffset={offset} crankAngleRef={crankAngleRef} />
      ))}
      <OrbitControls enablePan={false} minDistance={3} maxDistance={12} />
    </>
  )
}

export default function Engine3D({ rpm, state }: Props) {
  return (
    <Engine3DErrorBoundary>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
          <div className="card-title" style={{ margin: 0 }}>Digital twin — 3D engine (simulation visualization)</div>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-2)' }}>{rpm ? `${Math.round(rpm)} rpm` : '— rpm'}</span>
        </div>
        <div style={{ height: 420 }}>
          <Canvas camera={{ position: [5, 3.2, 6], fov: 42 }}>
            <Rig rpm={rpm} state={state} />
          </Canvas>
        </div>
      </div>
    </Engine3DErrorBoundary>
  )
}
