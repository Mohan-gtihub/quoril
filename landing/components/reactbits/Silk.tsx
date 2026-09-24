"use client";

import { useEffect, useRef } from "react";
import { Color, Mesh, Program, Renderer, Triangle } from "ogl";

const VERT = `
precision highp float;

attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;
varying vec2 vPosition;

void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;

uniform float uTime;
uniform vec3 uColor;
uniform float uSpeed;
uniform float uScale;
uniform float uRotation;
uniform float uNoiseIntensity;

varying vec2 vUv;
varying vec2 vPosition;

const float e = 2.71828182845904523536;

float noise(vec2 texCoord) {
  float G = e;
  vec2 r = (G * sin(G * texCoord));
  return fract(r.x * r.y * (1.0 + texCoord.x));
}

vec2 rotateUvs(vec2 uv, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  mat2 rot = mat2(c, -s, s, c);
  return rot * uv;
}

void main() {
  float rnd = noise(gl_FragCoord.xy);
  vec2 uv = rotateUvs(vUv * uScale, uRotation);
  vec2 tex = uv * uScale;
  float tOffset = uSpeed * uTime;

  tex.y += 0.03 * sin(8.0 * tex.x - tOffset);

  float pattern = 0.6 +
      0.4 * sin(5.0 * (tex.x + tex.y +
                       cos(3.0 * tex.x + 5.0 * tex.y) +
                       0.02 * tOffset) +
               sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));

  vec4 col = vec4(uColor, 1.0) * vec4(vec3(pattern), 1.0) - rnd / 15.0 * uNoiseIntensity;
  col.a = 1.0;
  gl_FragColor = col;
}
`;

interface SilkProps {
  speed?: number;
  scale?: number;
  color?: string;
  noiseIntensity?: number;
  rotation?: number;
  className?: string;
}

export default function Silk({
  speed = 5,
  scale = 1,
  color = "#5B8DEF",
  noiseIntensity = 1.5,
  rotation = 0,
  className,
}: SilkProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef({ speed, scale, color, noiseIntensity, rotation });
  propsRef.current = { speed, scale, color, noiseIntensity, rotation };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({ alpha: true, antialias: true });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    const geometry = new Triangle(gl);

    const toRgb = (hex: string): [number, number, number] => {
      const c = new Color(hex);
      return [c.r, c.g, c.b];
    };

    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: toRgb(color) },
        uSpeed: { value: speed },
        uScale: { value: scale },
        uRotation: { value: rotation },
        uNoiseIntensity: { value: noiseIntensity },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });

    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    container.appendChild(canvas);

    const resize = () => {
      renderer.setSize(container.offsetWidth, container.offsetHeight);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let raf = 0;

    const update = (t: number) => {
      raf = requestAnimationFrame(update);
      const p = propsRef.current;
      program.uniforms.uTime.value = t * 0.001;
      program.uniforms.uSpeed.value = p.speed;
      program.uniforms.uScale.value = p.scale;
      program.uniforms.uRotation.value = p.rotation;
      program.uniforms.uNoiseIntensity.value = p.noiseIntensity;
      program.uniforms.uColor.value = toRgb(p.color);
      renderer.render({ scene: mesh });
    };

    if (reduceMotion) {
      renderer.render({ scene: mesh });
    } else {
      raf = requestAnimationFrame(update);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      if (canvas.parentNode === container) {
        container.removeChild(canvas);
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color, noiseIntensity, rotation, scale, speed]);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ""}`}
    />
  );
}
