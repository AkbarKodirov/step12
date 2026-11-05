import { useMemo, useRef } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { humoMood } from './humoMood'

/**
 * Procedural 3D Humo — an ensō (the single brush-stroke circle a Zen master draws in one breath)
 * in Humo AI crimson, around a living crimson light, and a small white spark of
 * insight resting in the gap of the stroke. Everything is built from geometry: no model files.
 */

const easeOut = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3)
/** 0 → 1 over the first ~2s after mount: the stroke is drawn and the core lights up. */
export function introProgress(t: number, delay = 0.2, dur = 1.9) {
  return easeOut((t - delay) / dur)
}

/** A brush stroke swept along a circle: thick where the brush lands, thinning out to a dry tail. */
function ensoGeometry(R = 1.55, tube = 0.2, arc = Math.PI * 2 * 0.87, segs = 420, sides = 28) {
  const pos: number[] = []
  const nor: number[] = []
  const idx: number[] = []
  const start = Math.PI * 0.32 // the gap sits at the upper right
  for (let i = 0; i <= segs; i++) {
    const u = i / segs
    const a = start + u * arc
    // heavy landing, long even body, feathered tail; a slight wobble like real ink
    const w = tube * (Math.min(1, u * 9) ** 0.5 * (1 - 0.72 * u ** 2.2) * (0.94 + 0.06 * Math.sin(u * 37)))
    const c = new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0)
    const n1 = new THREE.Vector3(Math.cos(a), Math.sin(a), 0)
    const n2 = new THREE.Vector3(0, 0, 1)
    for (let j = 0; j <= sides; j++) {
      const v = (j / sides) * Math.PI * 2
      // flattened like a brush: wider in the plane than in depth
      const d = n1.clone().multiplyScalar(Math.cos(v) * w).add(n2.clone().multiplyScalar(Math.sin(v) * w * 0.55))
      pos.push(c.x + d.x, c.y + d.y, c.z + d.z)
      const nn = n1.clone().multiplyScalar(Math.cos(v) * 0.55).add(n2.clone().multiplyScalar(Math.sin(v))).normalize()
      nor.push(nn.x, nn.y, nn.z)
    }
  }
  for (let i = 0; i < segs; i++)
    for (let j = 0; j < sides; j++) {
      const a = i * (sides + 1) + j
      const b = a + sides + 1
      idx.push(a, b, a + 1, b, b + 1, a + 1)
    }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setIndex(idx)
  return g
}

/** Four-pointed spark: two crossed, stretched octahedra. */
function Spark(props: ThreeElements['group']) {
  return (
    <group {...props}>
      <mesh scale={[0.07, 0.3, 0.07]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={[3.2, 3.0, 3.1]} toneMapped={false} />
      </mesh>
      <mesh scale={[0.3, 0.07, 0.07]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={[3.2, 3.0, 3.1]} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color={[4, 3.6, 3.8]} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Ink motes that flow along the stroke, like energy travelling through the master's brush. */
function Motes({ count = 140 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)
  const seeds = useMemo(() => Array.from({ length: count }, () => [Math.random(), (Math.random() - 0.5) * 0.36, (Math.random() - 0.5) * 0.2, 0.4 + Math.random() * 0.8]), [count])
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    return g
  }, [count])
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const speed = 0.05 + humoMood.value * 0.22
    const pos = geo.attributes.position as THREE.BufferAttribute
    const p = introProgress(t)
    seeds.forEach(([u0, dr, dz, sp], i) => {
      const u = (((u0 + t * speed * sp) % 1) + 1) % 1
      const a = Math.PI * 0.32 + u * Math.PI * 2 * 0.87 * p
      const r = 1.55 + dr * (1 - u * 0.6)
      pos.setXYZ(i, Math.cos(a) * r, Math.sin(a) * r, dz)
    })
    pos.needsUpdate = true
    if (ref.current) (ref.current.material as THREE.PointsMaterial).opacity = 0.85 * p
  })
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.035} color="#ffc2d1" transparent opacity={0} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

/** A ripple leaves the core every few seconds, like a drop of ink touching still water. */
function Ripples() {
  const rings = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)]
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const period = 3.6 - humoMood.value * 1.8
    rings.forEach((r, i) => {
      if (!r.current) return
      const k = (((t / period + i / 3) % 1) + 1) % 1
      r.current.scale.setScalar(0.3 + k * 2.2)
      ;(r.current.material as THREE.MeshBasicMaterial).opacity = (1 - k) ** 2 * 0.55 * introProgress(t, 1.4, 1)
    })
  })
  return (
    <>
      {rings.map((r, i) => (
        <mesh key={i} ref={r}>
          <torusGeometry args={[1, 0.006, 8, 160]} />
          <meshBasicMaterial color={[1.8, 0.5, 0.8]} toneMapped={false} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </>
  )
}

/** Many faint additive shells read as one smooth glow: radius, opacity, colour (white-pink → crimson). */
const GLOW: [number, number, [number, number, number]][] = Array.from({ length: 9 }, (_, i) => {
  const k = i / 8
  return [0.17 + k * 0.6, 0.16 * (1 - k) ** 1.4 + 0.012, [2.6 - k * 1.6, 0.9 * (1 - k) + 0.04, 1.2 * (1 - k) + 0.22]]
})

export function HumoCore(props: ThreeElements['group']) {
  const root = useRef<THREE.Group>(null)
  const stroke = useRef<THREE.Mesh>(null)
  const light = useRef<THREE.Group>(null)
  const spark = useRef<THREE.Group>(null)
  const geo = useMemo(() => ensoGeometry(), [])
  const total = geo.index!.count

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    humoMood.value += (humoMood.target - humoMood.value) * 0.04
    const m = humoMood.value
    const p = introProgress(t)
    // the brush draws the circle in one breath
    geo.setDrawRange(0, Math.floor((total / 6) * p) * 6)
    if (root.current) {
      root.current.rotation.y = Math.sin(t * 0.35) * 0.28 + m * Math.sin(t * 1.6) * 0.12
      root.current.rotation.x = Math.sin(t * 0.27) * 0.08
      root.current.position.y = Math.sin(t * 0.9) * 0.06
    }
    if (stroke.current) stroke.current.rotation.z = Math.sin(t * 0.2) * 0.05 - m * 0.04
    const pulse = 0.5 + 0.5 * Math.sin(t * (1.4 + m * 3))
    if (light.current) light.current.scale.setScalar((0.9 + 0.12 * pulse + m * 0.3) * p)
    if (spark.current) {
      const a = Math.PI * 0.32 - 0.14 + Math.sin(t * 0.8) * 0.03
      spark.current.position.set(Math.cos(a) * 1.62, Math.sin(a) * 1.62, 0.12)
      spark.current.rotation.z = t * (0.6 + m * 2.5)
      spark.current.scale.setScalar(p * (0.9 + 0.25 * pulse + m * 0.4))
    }
  })

  return (
    <group ref={root} {...props}>
      <mesh ref={stroke} geometry={geo}>
        <meshPhysicalMaterial color="#a8092f" metalness={0.75} roughness={0.18} clearcoat={1} clearcoatRoughness={0.1} sheen={0.35} sheenColor="#ff7a98" envMapIntensity={1.5} />
      </mesh>
      {/* the living light inside: a white-hot heart in layered crimson glow (bloom does the rest) */}
      <group ref={light}>
        <mesh>
          <sphereGeometry args={[0.13, 32, 32]} />
          <meshBasicMaterial color={[4, 3.4, 3.6]} toneMapped={false} />
        </mesh>
        {GLOW.map(([r, o, c], i) => (
          <mesh key={i}>
            <sphereGeometry args={[r, 32, 32]} />
            <meshBasicMaterial color={c} toneMapped={false} transparent opacity={o} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        ))}
      </group>
      <Ripples />
      <Motes />
      <group ref={spark}>
        <Spark />
      </group>
    </group>
  )
}
