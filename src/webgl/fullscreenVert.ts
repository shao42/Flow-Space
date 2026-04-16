/** Fullscreen triangle (no buffer). WebGL2 GLSL ES 3.00 */
export const FULLSCREEN_VERT = `#version 300 es
const vec2 kPos[3] = vec2[](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(kPos[gl_VertexID], 0.0, 1.0);
}
`;
