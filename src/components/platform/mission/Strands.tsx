/*
 * Adapted for BarberSaaS from React Bits' Strands component.
 * Copyright (c) 2026 David Haz. See THIRD_PARTY_NOTICES.md.
 */
import { Color, Mesh, Program, Renderer, Triangle } from 'ogl';
import { useEffect, useRef, type CSSProperties } from 'react';

const MAX_STRANDS = 6;
const MAX_COLORS = 3;

const VERTEX_SHADER = `#version 300 es
in vec2 position;

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColors[${MAX_COLORS}];
uniform int uStrandCount;
uniform float uSpeed;
uniform float uAmplitude;
uniform float uWaviness;
uniform float uThickness;
uniform float uGlow;
uniform float uOpacity;

out vec4 fragColor;

const float PI = 3.14159265;

vec3 samplePalette(float t) {
  float scaled = fract(t) * float(${MAX_COLORS});
  int index = int(floor(scaled));
  float blend = fract(scaled);
  int nextIndex = index + 1;
  if (nextIndex >= ${MAX_COLORS}) nextIndex = 0;
  return mix(uColors[index], uColors[nextIndex], blend);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  uv *= 0.86;

  float envelope = pow(max(cos(uv.x * PI * 1.12), 0.0), 2.8);
  vec3 color = vec3(0.0);

  for (int i = 0; i < ${MAX_STRANDS}; i++) {
    if (i >= uStrandCount) break;

    float strand = float(i);
    float phase = strand * 1.82;
    float frequency = (1.75 + strand * 0.29) * uWaviness;
    float velocity = 0.72 + strand * 0.34;
    float time = uTime * uSpeed;

    float wave = sin(uv.x * frequency + time * velocity + phase) * 0.64
      + sin(uv.x * frequency * 1.18 - time * velocity * 0.58 + phase * 1.5) * 0.36;
    float y = wave * 0.13 * envelope * uAmplitude;
    float distanceToStrand = abs(uv.y - y);
    float width = 0.0085 * (0.45 + envelope) * uThickness;
    float light = width / (distanceToStrand + width * 0.72);
    light *= light;

    float palettePosition = strand / float(uStrandCount) + uv.x * 0.22 + uTime * 0.012;
    color += samplePalette(palettePosition) * light * envelope;
  }

  color = 1.0 - exp(-color * uGlow);
  float luminance = max(max(color.r, color.g), color.b);
  float alpha = clamp(luminance, 0.0, 1.0) * uOpacity;
  fragColor = vec4(color * uOpacity, alpha);
}
`;

export interface StrandsProps {
  colors: readonly [string, string, string];
  count?: number;
  speed?: number;
  amplitude?: number;
  waviness?: number;
  thickness?: number;
  glow?: number;
  opacity?: number;
  className?: string;
  style?: CSSProperties;
}

function buildPalette(colors: readonly string[]): number[][] {
  return colors.map((value) => {
    const color = new Color(value);
    return [color.r, color.g, color.b];
  });
}

export default function Strands({
  colors,
  count = 3,
  speed = 0.22,
  amplitude = 0.82,
  waviness = 0.78,
  thickness = 0.46,
  glow = 1.45,
  opacity = 0.34,
  className = '',
  style,
}: StrandsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.35);
    let renderer: Renderer;
    try {
      renderer = new Renderer({
        alpha: true,
        antialias: false,
        premultipliedAlpha: true,
        dpr: pixelRatio,
      });
    } catch (error) {
      console.warn('Strands no pudo iniciar WebGL; se mantiene el fondo estático.', error);
      return;
    }

    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.canvas.setAttribute('aria-hidden', 'true');

    const geometry = new Triangle(gl);
    if (geometry.attributes.uv) delete geometry.attributes.uv;

    const program = new Program(gl, {
      vertex: VERTEX_SHADER,
      fragment: FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [1, 1] },
        uColors: { value: buildPalette(colors) },
        uStrandCount: { value: Math.min(Math.max(Math.round(count), 1), MAX_STRANDS) },
        uSpeed: { value: speed },
        uAmplitude: { value: amplitude },
        uWaviness: { value: waviness },
        uThickness: { value: thickness },
        uGlow: { value: glow },
        uOpacity: { value: opacity },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });

    container.appendChild(gl.canvas);
    let renderedWidth = 0;
    let renderedHeight = 0;

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      const nextWidth = Math.round(width);
      const nextHeight = Math.round(height);
      if (nextWidth === renderedWidth && nextHeight === renderedHeight) return;
      renderedWidth = nextWidth;
      renderedHeight = nextHeight;
      renderer.setSize(nextWidth, nextHeight);
      program.uniforms.uResolution.value = [nextWidth * pixelRatio, nextHeight * pixelRatio];
    };

    const resizeObserver =
      'ResizeObserver' in window ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(container);
    if (!resizeObserver) window.addEventListener('resize', resize);
    resize();

    let frameId: number | null = null;
    let isInView = true;
    let elapsed = 0;
    let previousFrame = performance.now();

    const shouldAnimate = () => document.visibilityState === 'visible' && isInView;

    const render = (now: number) => {
      frameId = null;
      elapsed += Math.min(now - previousFrame, 34);
      previousFrame = now;
      program.uniforms.uTime.value = elapsed * 0.001;
      renderer.render({ scene: mesh });
      if (shouldAnimate()) frameId = requestAnimationFrame(render);
    };

    const syncAnimation = () => {
      if (shouldAnimate() && frameId === null) {
        previousFrame = performance.now();
        frameId = requestAnimationFrame(render);
      } else if (!shouldAnimate() && frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
    };

    const intersectionObserver =
      'IntersectionObserver' in window
        ? new IntersectionObserver(([entry]) => {
            isInView = entry?.isIntersecting ?? false;
            syncAnimation();
          })
        : null;
    intersectionObserver?.observe(container);
    document.addEventListener('visibilitychange', syncAnimation);
    syncAnimation();

    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      document.removeEventListener('visibilitychange', syncAnimation);
      intersectionObserver?.disconnect();
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener('resize', resize);
      if (gl.canvas.parentNode === container) container.removeChild(gl.canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [amplitude, colors, count, glow, opacity, speed, thickness, waviness]);

  return (
    <div
      ref={containerRef}
      className={`mission-strands ${className}`.trim()}
      style={style}
      aria-hidden="true"
    />
  );
}
