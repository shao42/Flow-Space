/** WebGL2: one empty VAO per context for attribute-less fullscreen triangle draws. */
const vaoByGl = new WeakMap<WebGL2RenderingContext, WebGLVertexArrayObject>();

export function bindFullscreenVao(gl: WebGL2RenderingContext): void {
  let vao = vaoByGl.get(gl);
  if (!vao) {
    const created = gl.createVertexArray();
    if (!created) return;
    vaoByGl.set(gl, created);
    vao = created;
  }
  gl.bindVertexArray(vao);
}
