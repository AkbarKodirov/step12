import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, Sparkles } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { HumoCore, introProgress } from './HumoCore'
import { humoMood } from './humoMood'

type Layout = 'hero' | 'compact' | 'banner'

/** Thin glowing rings behind Humo. */
function Halo() {
  const a = useRef<THREE.Mesh>(null)
  const b = useRef<THREE.Mesh>(null)
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (g.current) g.current.scale.setScalar(0.4 + 0.6 * introProgress(t, 0.5, 1.6))
    if (a.current) a.current.rotation.z = t * 0.05
    if (b.current) {
      b.current.rotation.x = 1.2 + Math.sin(t * 0.2) * 0.08
      b.current.rotation.z = -t * 0.08
    }
  })
  return (
    <group ref={g} position={[0, 0.35, -1.1]}>
      <mesh ref={a}>
        <torusGeometry args={[2.35, 0.016, 24, 720]} />
        <meshBasicMaterial color={[2.2, 0.55, 0.85]} toneMapped={false} transparent opacity={0.75} />
      </mesh>
      <mesh ref={b} rotation={[1.2, 0, 0]}>
        <torusGeometry args={[2.9, 0.012, 24, 720]} />
        <meshBasicMaterial color={[1.9, 2.0, 2.4]} toneMapped={false} transparent opacity={0.6} />
      </mesh>
    </group>
  )
}

/** Drifting starlight filling the whole hero. */
function GoldDust({ count = 1400 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const p = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 3 + Math.random() * 9
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      p[i * 3] = r * Math.sin(ph) * Math.cos(th)
      p[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.6
      p[i * 3 + 2] = r * Math.cos(ph) - 4
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    return g
  }, [count])
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.012
  })
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.034} color="#dfe7f6" transparent opacity={0.8} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

/** Places Humo depending on screen shape and scroll position. */
function Rig({ layout, children }: { layout: Layout; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null)
  const { viewport, size } = useThree()
  const wide = size.width >= 900
  const snapped = useRef(false)

  useFrame(() => {
    const g = group.current
    if (!g) return
    const scroll = layout === 'hero' ? Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1.2) : 0
    // banner: one full-width scene behind the home greeting, Humo large on the right (top-right corner on phones)
    const banner = layout === 'banner'
    const baseX = banner ? viewport.width * (wide ? 0.29 : 0.33) : layout === 'hero' && wide ? viewport.width * 0.25 : 0
    const baseY = banner ? (wide ? 0.05 : viewport.height * 0.3) : layout === 'hero' ? (wide ? -0.15 : viewport.height * 0.22) : 0.1
    const baseScale = banner ? (wide ? Math.min(0.9, viewport.height / 5.2) : 0.42) : layout === 'compact' ? 0.58 : wide ? Math.min(0.66, viewport.height / 7.4) : Math.min(0.5, viewport.width / 6)
    const s = baseScale * (1 - scroll * 0.15)
    // first frame snaps into place (matters for reduced-motion, which renders on demand)
    const k = snapped.current ? 0.08 : 1
    snapped.current = true
    g.position.x = THREE.MathUtils.lerp(g.position.x, baseX, k)
    g.position.y = THREE.MathUtils.lerp(g.position.y, baseY + scroll * 1.6, k)
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, scroll * 0.35, k)
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, s, k))
  })

  return <group ref={group}>{children}</group>
}

/** Stars drifting across the whole banner, behind the greeting too. */
function BannerStars({ count }: { count: number }) {
  const { viewport } = useThree()
  return <Sparkles count={count} scale={[viewport.width, viewport.height, 2]} size={2.4} speed={0.4} color="#ffd1dc" opacity={0.85} />
}

/** On-demand mode (reduced motion) renders only when asked — keep asking until assets and effects settle. */
function SettleFrames() {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    let n = 0
    const id = setInterval(() => {
      invalidate()
      if (++n > 40) clearInterval(id)
    }, 100)
    return () => clearInterval(id)
  }, [invalidate])
  return null
}

export default function HumoScene({ layout = 'hero', bg = '#050e19' }: { layout?: Layout; bg?: string }) {
  useEffect(() => {
    humoMood.target = 0 // a fresh scene always starts calm
  }, [])
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  // phones get a lighter scene: lower pixel ratio and fewer particles, so it stays smooth and saves battery
  const small = typeof window !== 'undefined' && window.innerWidth < 768
  return (
    <Canvas
      dpr={small ? [1.5, 2] : [1.75, 2.5]}
      camera={{ position: [0, 0.2, 8], fov: 34 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      frameloop={reduced ? 'demand' : 'always'}
      style={{ background: 'transparent' }}
    >
      {reduced && <SettleFrames />}
      <color attach="background" args={[bg]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 6]} intensity={2.8} color="#ffffff" />
      <directionalLight position={[-4, 3, 6]} intensity={1.2} color="#dbe6ff" />
      <directionalLight position={[-6, 2, -4]} intensity={1.1} color="#e0456b" />
      <pointLight position={[0, -0.5, 4]} intensity={2} color="#ffd6e0" distance={9} />

      <Suspense fallback={null}>
        <Rig layout={layout}>
          <Halo />
          <HumoCore />
          <Sparkles count={small ? 40 : 80} scale={[6, 5, 3]} size={3} speed={0.35} color="#ffe3ea" opacity={1} />
        </Rig>
        {layout === 'hero' && <GoldDust count={small ? 500 : 1400} />}
        {layout === 'banner' && <BannerStars count={small ? 50 : 120} />}

        {/* Studio lighting baked into an environment — no HDR download needed */}
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={4} color="#ffffff" position={[0, 5, 2]} scale={[10, 2, 1]} />
          <Lightformer form="rect" intensity={2.5} color="#9db8e8" position={[-5, 1, 3]} scale={[2, 8, 1]} rotation-y={Math.PI / 2} />
          <Lightformer form="rect" intensity={2} color="#ffffff" position={[5, 0, 2]} scale={[2, 6, 1]} rotation-y={-Math.PI / 2} />
          <Lightformer form="ring" intensity={2.5} color="#e0456b" position={[0, -3, 4]} scale={4} />
          <Lightformer form="rect" intensity={1.4} color="#85082a" position={[0, 2, -6]} scale={[12, 4, 1]} />
        </Environment>
      </Suspense>

      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={1.05} luminanceThreshold={0.7} luminanceSmoothing={0.25} />
        <Vignette eskil={false} offset={0.25} darkness={layout === "hero" ? 0.4 : 0} />
      </EffectComposer>
    </Canvas>
  )
}
