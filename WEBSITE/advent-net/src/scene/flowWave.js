import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js'
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js'
import { FINAL_FRAGMENT, FINAL_VERTEX, MOTES_FRAGMENT, MOTES_VERTEX, POINTS_FRAGMENT, POINTS_VERTEX } from './shaders.js'

/*
 * "Flow Wave" from GetLayers (getlayers.ai/layer/flow-wave), built to its prompt: a sea of glowing
 * particle hills the camera dives into as the page scrolls. Geometry, shaders, motion and every
 * number below are the layer's own, with these changes for AdventWave:
 *
 * - Colours: the layer's emerald is AdventWave's violet (--aw-primary #6d5df6) with a gold
 *   corner flame (--aw-gold #c9a227), the web app's two brand colours.
 * - It is the background of a real page, not a page of its own: the content is the scroll host,
 *   the canvas sizes to its box, pixel ratio stops at 2, and the cursor only "leaves" when it
 *   leaves the window (mouseout bubbles from every element on a page with content).
 * - The torus and bloom layers hold no objects, so their composers always produce the same black
 *   frame. They render once, and again after a resize, instead of every frame.
 * - prefers-reduced-motion holds the swell and the flames still; scrolling still moves the camera.
 * - dispose() releases the GPU context and its canvas, so React can mount and unmount it.
 */

const bgColor = '#0b0918' // FinalPass background tint
const flameColor = '#6d5df6' // corner-flame A
const flameColor2 = '#d9bd62' // corner-flame B
const flameAmt = 0.2 // corner-flame intensity
const atmoColor = '#b3a8ff' // ambient motes color
const atmoCount = 300 // mote count
const atmoSize = 24 // mote base size
const atmoSpeed = 1.0 // mote warp speed
const colorLow = '#0b0918' // points low color
const colorHigh = '#9f92ff' // points high color
const opacity = 0.26 // point opacity
const pointSize = 5.5 // point base size
const brightness = 0.45 // point color multiplier
const waveHeight = 3 // base swell amplitude
const flow = 1 // noise scroll speed
const tilt = 0 // sheet X rotation (negated)
const scale = 0.275 // shrinks the sheet to frame
const scrollRise = 1.0 // swell amplitude growth on scroll
const camStartY = 7,
  camStartZ = 16 // scroll 0 camera
const camEndY = 0.8,
  camEndZ = -2 // scroll 1 camera
const lookStartZ = 2,
  lookEndZ = -16 // look-target pan
const parallax = 1.2
const pointerRadius = 7.0
const pointerStrength = 0.9

const MAX_PIXEL_RATIO = 2

const LAYERS = { NONE: 0, TORUS_SCENE: 1, BLOOM_SCENE: 2, ENTIRE_SCENE: 3 }

const Lerp = (a, b, t) => a + (b - a) * t
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
function hexToVec3(hex) {
  const n = parseInt(hex.slice(1), 16)
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

/**
 * Starts the scene in a canvas of its own inside `container`, filling it, and keeps it running
 * until dispose(), which removes the canvas again. A canvas is never reused: once its context has
 * been released it cannot make another, so a remount (React Fast Refresh, StrictMode) would
 * otherwise come back blank. Throws when the browser has no WebGL; the container's CSS background
 * is what shows then.
 *
 * @param {HTMLElement} container
 * @param {{ reducedMotion?: boolean }} [options]
 * @returns {{ dispose: () => void }}
 */
export function createFlowWave(container, { reducedMotion = false } = {}) {
  const pixelRatio = () => Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)
  // With reduced motion the clock stands still at a moment where the hills are well formed.
  const frozenAt = performance.now() / 1000
  const now = () => (reducedMotion ? frozenAt : performance.now() / 1000)

  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'
  container.appendChild(canvas)

  let renderer
  try {
    renderer = new THREE.WebGL1Renderer({ canvas, antialias: true })
  } catch (error) {
    canvas.remove()
    throw error
  }
  renderer.setPixelRatio(pixelRatio())
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.VSMShadowMap

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)
  scene.fog = new THREE.Fog(0x000000, 0, 15)

  const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / Math.max(1, canvas.clientHeight), 0.1, 400)
  camera.position.set(0, 7, 16)
  camera.layers.enable(LAYERS.TORUS_SCENE)
  camera.layers.enable(LAYERS.BLOOM_SCENE)
  camera.layers.enable(LAYERS.ENTIRE_SCENE)
  scene.add(camera)

  // ---------------------------------------------------------------- postprocessing
  const size = () => new THREE.Vector2(canvas.clientWidth, canvas.clientHeight)
  const renderPass = new RenderPass(scene, camera)

  const torusComposer = new EffectComposer(renderer)
  torusComposer.renderToScreen = false
  torusComposer.addPass(renderPass)
  torusComposer.addPass(new ShaderPass(GammaCorrectionShader))
  const torusBloom = new UnrealBloomPass(size(), 0.22, 0.2, 0)
  torusComposer.addPass(torusBloom)
  torusComposer.addPass(new ShaderPass(CopyShader))

  const bloomComposer = new EffectComposer(renderer)
  bloomComposer.renderToScreen = false
  bloomComposer.addPass(renderPass)
  const bloomPass = new UnrealBloomPass(size(), 0.4, 0.55, 0)
  bloomComposer.addPass(bloomPass)
  bloomComposer.addPass(new ShaderPass(GammaCorrectionShader))

  const finalPass = new ShaderPass({
    uniforms: {
      iTime: { value: 0 },
      tDiffuse: { value: null },
      torusTexture: { value: null },
      bloomTexture: { value: null },
      haloTexture: { value: null },
      uBg: { value: hexToVec3(bgColor) },
      uFlameA: { value: hexToVec3(flameColor) },
      uFlameB: { value: hexToVec3(flameColor2) },
      uFlameAmt: { value: flameAmt },
    },
    vertexShader: FINAL_VERTEX,
    fragmentShader: FINAL_FRAGMENT,
  })
  const finalComposer = new EffectComposer(renderer)
  finalComposer.addPass(renderPass)
  finalComposer.addPass(finalPass)
  finalPass.uniforms.bloomTexture.value = bloomComposer.renderTarget1.texture
  finalPass.uniforms.torusTexture.value = torusComposer.renderTarget1.texture

  // ---------------------------------------------------------------- the particle sea
  const geometry = new THREE.SphereGeometry(4.2, 200, 600)
  const uniforms = {
    uTime: { value: 0 },
    uStream: { value: 0 },
    uAppear: { value: 0 },
    uColLow: { value: hexToVec3(colorLow) },
    uColHigh: { value: hexToVec3(colorHigh) },
    uOpacity: { value: opacity },
    uSize: { value: pointSize },
    uBrightness: { value: brightness },
    uWaveHeight: { value: waveHeight },
    uFlow: { value: flow },
    uScale: { value: scale },
    uCursor: { value: new THREE.Vector3() },
    uRepelRadius: { value: pointerRadius },
    uRepelStrength: { value: pointerStrength },
    uActivity: { value: 0 },
  }
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: POINTS_VERTEX,
    fragmentShader: POINTS_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  points.layers.enable(LAYERS.ENTIRE_SCENE)
  const group = new THREE.Group()
  group.add(points)
  scene.add(group)

  // ---------------------------------------------------------------- ambient motes
  const motes = (() => {
    const N = Math.round(atmoCount)
    const positions = new Float32Array(N * 3)
    const sizes = new Float32Array(N)
    const seeds = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      positions[i * 3] = 2 * Math.random() - 1
      positions[i * 3 + 1] = 2 * Math.random() - 1
      positions[i * 3 + 2] = 2 * Math.random() - 1
      sizes[i] = atmoSize * (0.4 + Math.random())
      seeds[i] = Math.random()
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('seed', new THREE.BufferAttribute(seeds, 1))
    const atmoMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: hexToVec3(atmoColor) },
        uRes: { value: new THREE.Vector2(window.innerWidth * pixelRatio(), window.innerHeight * pixelRatio()) },
      },
      vertexShader: MOTES_VERTEX,
      fragmentShader: MOTES_FRAGMENT,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })
    const pts = new THREE.Points(geo, atmoMat)
    pts.frustumCulled = false
    pts.layers.enable(LAYERS.ENTIRE_SCENE)
    pts.onBeforeRender = () => {
      const t = now()
      atmoMat.uniforms.uTime.value = t * atmoSpeed * 8.0
      pts.position.copy(camera.position)
      finalPass.uniforms.iTime.value = t
    }
    scene.add(pts)
    return { geometry: geo, material: atmoMat }
  })()

  // ---------------------------------------------------------------- input
  let scrollTarget = 0
  let scrollSmooth = 0
  let scrollCurrent = 0
  const mouseTarget = { x: 0, y: 0 }
  const mouse = { x: 0, y: 0 }
  const POINTER = { world: new THREE.Vector3(), activity: 0, active: false, lastMove: performance.now() }

  function onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight
    scrollTarget = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0
  }
  function onMouseMove(event) {
    mouseTarget.x = (event.clientX / window.innerWidth) * 2 - 1
    mouseTarget.y = -((event.clientY / window.innerHeight) * 2 - 1)
    POINTER.active = true
    POINTER.lastMove = performance.now()
  }
  function onMouseOut(event) {
    if (!event.relatedTarget) POINTER.active = false
  }

  const _ndc = new THREE.Vector3()
  const _dir = new THREE.Vector3()
  const _tgt = new THREE.Vector3()
  function updatePointerWorld() {
    _tgt.set(0, 0, 0)
    if (POINTER.active) {
      _ndc.set(mouse.x, mouse.y, 0.5).unproject(camera)
      _dir.copy(_ndc).sub(camera.position).normalize()
      const dn = _dir.z
      if (Math.abs(dn) > 1e-4) {
        const tt = -camera.position.z / dn
        if (tt > 0 && Number.isFinite(tt)) _tgt.copy(camera.position).addScaledVector(_dir, tt)
      }
    }
    POINTER.world.lerp(_tgt, 0.12)
    const idle = (performance.now() - POINTER.lastMove) / 1000
    POINTER.activity += ((POINTER.active && idle < 3 ? 1 : 0) - POINTER.activity) * 0.06
  }

  // ---------------------------------------------------------------- per frame
  const sceneObj = {
    stream: 0,
    appearStart: performance.now(),
    t0: performance.now() / 1000,
    render(scroll, m) {
      const t = performance.now() / 1000
      const dt = Math.min(0.05, t - this.t0)
      this.t0 = t
      uniforms.uTime.value = now()

      // Stream the hills toward us at a constant rate; grow the swell with scroll.
      if (!reducedMotion) this.stream += dt * (flow * 2.0) * 4.0
      uniforms.uStream.value = this.stream
      uniforms.uWaveHeight.value = waveHeight * (1 + scroll * scrollRise)

      // Camera fly-path: smoothstep over the first 35% of scroll.
      const ea = Math.min(scroll / 0.35, 1.0)
      const e = ea * ea * (3 - 2 * ea)
      const camY = Lerp(camStartY, camEndY, e)
      const camZ = Lerp(camStartZ, camEndZ, e)
      camera.position.set(m.x * parallax, camY + m.y * parallax * 0.3, camZ)
      camera.lookAt(m.x * parallax * 0.5, Lerp(0.0, 0.6, e), Lerp(lookStartZ, lookEndZ, e))
      group.rotation.x = -tilt
      group.rotation.y = 0
      updatePointerWorld()

      uniforms.uCursor.value.copy(POINTER.world)
      uniforms.uActivity.value = POINTER.activity
      const elapsed = (performance.now() - this.appearStart) / 1000
      uniforms.uAppear.value = Math.max(0, Math.min(1, (elapsed - 0.2) / 1.4)) // 0.2s delay, 1.4s fade-in
    },
  }

  let emptyLayersStale = true
  let frame = 0
  function loop() {
    frame = requestAnimationFrame(loop)
    scrollSmooth = Lerp(scrollSmooth, scrollTarget, 0.1)
    scrollCurrent = Lerp(scrollCurrent, scrollSmooth, 0.06)
    mouse.x = Lerp(mouse.x, mouseTarget.x, 0.06)
    mouse.y = Lerp(mouse.y, mouseTarget.y, 0.06)
    sceneObj.render(scrollCurrent, mouse)
    if (emptyLayersStale) {
      camera.layers.set(LAYERS.TORUS_SCENE)
      torusComposer.render()
      camera.layers.set(LAYERS.BLOOM_SCENE)
      bloomComposer.render()
      emptyLayersStale = false
    }
    camera.layers.set(LAYERS.ENTIRE_SCENE)
    finalComposer.render()
  }

  function resize() {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (!w || !h) return
    const dpr = pixelRatio()
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    for (const composer of [torusComposer, bloomComposer, finalComposer]) {
      composer.setPixelRatio(dpr)
      composer.setSize(w, h)
    }
    motes.material.uniforms.uRes.value.set(window.innerWidth * dpr, window.innerHeight * dpr)
    emptyLayersStale = true
    onScroll()
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('mousemove', onMouseMove, { passive: true })
  document.addEventListener('mouseout', onMouseOut)
  window.addEventListener('resize', resize)
  resize()
  loop()

  return {
    dispose() {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseout', onMouseOut)
      window.removeEventListener('resize', resize)
      geometry.dispose()
      material.dispose()
      motes.geometry.dispose()
      motes.material.dispose()
      torusBloom.dispose()
      bloomPass.dispose()
      for (const composer of [torusComposer, bloomComposer, finalComposer]) {
        composer.renderTarget1.dispose()
        composer.renderTarget2.dispose()
      }
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
    },
  }
}
