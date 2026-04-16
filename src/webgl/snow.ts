import { compileShader, linkProgram } from './glUtils';
import { FULLSCREEN_VERT } from './fullscreenVert';
import { bindFullscreenVao } from './vao';

/**
 * "Just snow" — Andrew Baldwin (thndl.com). CC BY-NC-SA 3.0.
 * Optional fullscreen background via `u_bg` (see `loadSnowBackground`).
 */
const FRAG = `#version 300 es
precision highp float;
precision highp int;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_intensity;
uniform float u_bg_ready;
uniform sampler2D u_bg;
out vec4 fragColor;

#define LIGHT_SNOW
#ifdef LIGHT_SNOW
#define LAYERS 50
#define DEPTH .5
#define WIDTH .3
#define SPEED .6
#else
#define LAYERS 200
#define DEPTH .1
#define WIDTH .8
#define SPEED 1.5
#endif

void main() {
  const mat3 p = mat3(13.323122,23.5112,21.71123,21.1212,28.7312,11.9312,21.8112,14.7212,61.3934);
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 res = u_resolution.xy;
  vec2 uv = vec2(1.0, res.y / res.x) * (fragCoord.xy / res);
  vec3 acc = vec3(0.0);
  float dof = 5.0 * sin(u_time * 0.1);
  for (int i = 0; i < LAYERS; i++) {
    float fi = float(i);
    vec2 q = uv * (1.0 + fi * DEPTH);
    q += vec2(q.y * (WIDTH * mod(fi * 7.238917, 1.0) - WIDTH * 0.5), SPEED * u_time / (1.0 + fi * DEPTH * 0.03));
    vec3 n = vec3(floor(q), 31.189 + fi);
    vec3 m = floor(n) * 0.00001 + fract(n);
    vec3 mp = (31415.9 + m) / fract(p * m);
    vec3 r = fract(mp);
    vec2 s = abs(mod(q, 1.0) - 0.5 + 0.9 * r.xy - 0.45);
    s += 0.01 * abs(2.0 * fract(10.0 * q.yx) - 1.0);
    float d = 0.6 * max(s.x - s.y, s.x + s.y) + max(s.x, s.y) - 0.01;
    float edge = 0.005 + 0.05 * min(0.5 * abs(fi - 5.0 - dof), 1.0);
    acc += vec3(smoothstep(edge, -edge, d) * (r.x / (1.0 + 0.02 * fi * DEPTH)));
  }
  vec3 snow = vec3(acc) * (0.45 + 0.55 * clamp(u_intensity, 0.0, 1.0));
  vec2 st = vec2(fragCoord.x / max(res.x, 1.0), fragCoord.y / max(res.y, 1.0));
  vec3 bg = mix(vec3(0.034, 0.044, 0.068), vec3(0.072, 0.082, 0.11), st.y);
  if (u_bg_ready > 0.5) {
    bg = texture(u_bg, st).rgb;
  }
  fragColor = vec4(clamp(bg + snow, 0.0, 1.0), 1.0);
}
`;

export type SnowProgram = {
  program: WebGLProgram;
  uResolution: WebGLUniformLocation | null;
  uTime: WebGLUniformLocation | null;
  uIntensity: WebGLUniformLocation | null;
  uBgReady: WebGLUniformLocation | null;
  uBg: WebGLUniformLocation | null;
};

export function createSnowProgram(gl: WebGL2RenderingContext): SnowProgram | null {
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
    uBgReady: gl.getUniformLocation(program, 'u_bg_ready'),
    uBg: gl.getUniformLocation(program, 'u_bg'),
  };
}

/** Upload `/public/snow-bg-<id>.jpg` (or any image URL) to a 2D texture. */
export function loadSnowBackground(gl: WebGL2RenderingContext, url: string): Promise<WebGLTexture | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const tex = gl.createTexture();
      if (!tex) {
        resolve(null);
        return;
      }
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindTexture(gl.TEXTURE_2D, null);
      resolve(tex);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function deleteSnowBackground(gl: WebGL2RenderingContext, tex: WebGLTexture | null): void {
  if (tex) gl.deleteTexture(tex);
}

export function drawSnow(
  gl: WebGL2RenderingContext,
  sp: SnowProgram,
  width: number,
  height: number,
  time: number,
  intensity01: number,
  backgroundTex: WebGLTexture | null
): void {
  bindFullscreenVao(gl);
  gl.useProgram(sp.program);
  if (sp.uResolution) gl.uniform2f(sp.uResolution, width, height);
  if (sp.uTime) gl.uniform1f(sp.uTime, time);
  if (sp.uIntensity) gl.uniform1f(sp.uIntensity, intensity01);
  if (sp.uBgReady) gl.uniform1f(sp.uBgReady, backgroundTex ? 1.0 : 0.0);
  if (backgroundTex && sp.uBg) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, backgroundTex);
    gl.uniform1i(sp.uBg, 0);
  }
  gl.disable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
