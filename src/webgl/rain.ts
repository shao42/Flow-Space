import { compileShader, linkProgram } from './glUtils';
import { FULLSCREEN_VERT } from './fullscreenVert';
import { bindFullscreenVao } from './vao';

/**
 * Heartfelt — BigWIngs / Shadertoy ltffzl. CC BY-NC-SA 3.0.
 *
 * Non–HAS_HEART path: `T = iTime`, `#else` zoom; `rainAmount` from `sin(T)` × **u_intensity** (Vibe Mixer).
 * `textureLod(iChannel0,…)` → procedural stand-in with fine detail so droplet normals refract visibly.
 */
const FRAG = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_intensity;
out vec4 fragColor;

#define S(a, b, t) smoothstep(a, b, t)

vec3 N13(float p) {
  vec3 p3 = fract(vec3(p) * vec3(.1031,.11369,.13787));
  p3 += dot(p3, p3.yzx + 19.19);
  return fract(vec3((p3.x + p3.y)*p3.z, (p3.x+p3.z)*p3.y, (p3.y+p3.z)*p3.x));
}

float N(float t) {
  return fract(sin(t*12345.564)*7658.76);
}

float Saw(float b, float t) {
  return S(0., b, t)*S(1., b, t);
}

vec2 DropLayer2(vec2 uv, float t) {
  vec2 UV = uv;
  uv.y += t*0.75;
  vec2 a = vec2(6., 1.);
  vec2 grid = a*2.;
  vec2 id = floor(uv*grid);
  float colShift = N(id.x);
  uv.y += colShift;
  id = floor(uv*grid);
  vec3 n = N13(id.x*35.2+id.y*2376.1);
  vec2 st = fract(uv*grid)-vec2(.5, 0.);
  float x = n.x-.5;
  float y = UV.y*20.;
  float wiggle = sin(y+sin(y));
  x += wiggle*(.5-abs(x))*(n.z-.5);
  x *= .7;
  float ti = fract(t+n.z);
  y = (Saw(.85, ti)-.5)*.9+.5;
  vec2 p = vec2(x, y);
  float d = length((st-p)*a.yx);
  float mainDrop = S(.4, .0, d);
  float r = sqrt(S(1., y, st.y));
  float cd = abs(st.x-x);
  float trail = S(.23*r, .15*r*r, cd);
  float trailFront = S(-.02, .02, st.y-y);
  trail *= trailFront*r*r;
  y = UV.y;
  float trail2 = S(.2*r, .0, cd);
  float droplets = max(0.0, (sin(y*(1.-y)*120.)-st.y))*trail2*trailFront*n.z;
  y = fract(y*10.)+(st.y-.5);
  float dd = length(st-vec2(x, y));
  droplets = S(.3, 0., dd);
  float m = mainDrop+droplets*r*trailFront;
  return vec2(m, trail);
}

float StaticDrops(vec2 uv, float t) {
  uv *= 40.;
  vec2 id = floor(uv);
  uv = fract(uv)-.5;
  vec3 n = N13(id.x*107.45+id.y*3543.654);
  vec2 p = (n.xy-.5)*.7;
  float d = length(uv-p);
  float fade = Saw(.025, fract(t+n.z));
  float c = S(.3, 0., d)*fract(n.z*10.)*fade;
  return c;
}

vec2 Drops(vec2 uv, float t, float l0, float l1, float l2) {
  float s = StaticDrops(uv, t)*l0;
  vec2 m1 = DropLayer2(uv, t)*l1;
  vec2 m2 = DropLayer2(uv*1.85, t)*l2;
  float c = s+m1.x+m2.x;
  c = S(.3, 1., c);
  return vec2(c, max(m1.y*l0, m2.y*l1));
}

/** Mimics textureLod(iChannel0, uv, lod): busy night scene + blur from LOD. */
vec3 sampleChannel(vec2 uv, float lod) {
  uv = clamp(uv, vec2(0.001), vec2(0.999));
  float y = uv.y;
  vec2 p = uv * vec2(18.0, 24.0);
  float city = sin(p.x) * sin(p.y * 0.7) + sin(p.x * 0.5 + p.y * 1.3) * 0.5;
  float glow = exp(-length((uv - vec2(0.35, 0.72)) * vec2(4.5, 2.8))) * 0.45;
  vec3 base = mix(vec3(0.06, 0.07, 0.11), vec3(0.18, 0.2, 0.26), y);
  base += vec3(0.25, 0.22, 0.18) * max(0.0, city) * 0.12;
  base += vec3(0.35, 0.38, 0.42) * glow;
  float b = clamp(lod / 7.0, 0.0, 1.0);
  vec3 soft = mix(base * 0.85, vec3(0.1, 0.11, 0.14), b * 0.6);
  return mix(base, soft, b * 0.75);
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 uv = (fragCoord - 0.5 * u_resolution.xy) / u_resolution.y;
  vec2 UV = fragCoord.xy / u_resolution.xy;

  float T = u_time;
  float t = T * 0.2;
  float rainWave = sin(T * 0.05) * 0.3 + 0.7;
  float rainAmount = clamp(rainWave * (0.45 + 0.55 * clamp(u_intensity, 0.0, 1.0)), 0.2, 1.0);

  float maxBlur = mix(3.0, 6.0, rainAmount);
  float minBlur = 2.0;

  float zoom = -cos(T * 0.2);
  uv *= 0.7 + zoom * 0.3;
  UV = (UV - 0.5) * (0.9 + zoom * 0.1) + 0.5;

  float staticDrops = S(-0.5, 1.0, rainAmount) * 2.0;
  float layer1 = S(0.25, 0.75, rainAmount);
  float layer2 = S(0.0, 0.5, rainAmount);

  vec2 c = Drops(uv, t, staticDrops, layer1, layer2);

  vec2 e = vec2(0.001, 0.0);
  float cx = Drops(uv + e, t, staticDrops, layer1, layer2).x;
  float cy = Drops(uv + e.yx, t, staticDrops, layer1, layer2).x;
  vec2 n = vec2(cx - c.x, cy - c.x);

  float focus = mix(maxBlur - c.y, minBlur, S(0.1, 0.2, c.x));
  vec3 col = sampleChannel(UV + n, focus);

  float story = 0.0;
  t = (T + 3.0) * 0.5;
  float colFade = sin(t * 0.2) * 0.5 + 0.5 + story;
  col *= mix(vec3(1.0), vec3(0.8, 0.9, 1.3), colFade);
  float fade = S(0.0, 10.0, T);
  float lightning = sin(t * sin(t * 10.0));
  lightning *= pow(max(0.0, sin(t + sin(t))), 10.0);
  col *= 1.0 + lightning * fade * mix(1.0, 0.1, story * story);
  vec2 uvV = UV - 0.5;
  col *= 1.0 - dot(uvV, uvV);

  col *= mix(0.18, 1.0, fade);

  fragColor = vec4(col, 1.0);
}
`;

export type RainProgram = {
  program: WebGLProgram;
  uResolution: WebGLUniformLocation | null;
  uTime: WebGLUniformLocation | null;
  uIntensity: WebGLUniformLocation | null;
};

export function createRainProgram(gl: WebGL2RenderingContext): RainProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, FULLSCREEN_VERT);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const program = linkProgram(gl, vs, fs);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!program) return null;
  return {
    program,
    uResolution: gl.getUniformLocation(program, 'u_resolution'),
    uTime: gl.getUniformLocation(program, 'u_time'),
    uIntensity: gl.getUniformLocation(program, 'u_intensity'),
  };
}

export function drawRain(
  gl: WebGL2RenderingContext,
  rp: RainProgram,
  width: number,
  height: number,
  time: number,
  intensity01: number
): void {
  bindFullscreenVao(gl);
  gl.useProgram(rp.program);
  if (rp.uResolution) gl.uniform2f(rp.uResolution, width, height);
  if (rp.uTime) gl.uniform1f(rp.uTime, time);
  if (rp.uIntensity) gl.uniform1f(rp.uIntensity, intensity01);
  gl.disable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
