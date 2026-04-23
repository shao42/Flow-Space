import { useCallback, useEffect, useRef, useState } from 'react';
import { useFlowStore } from '../store/flowStore';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { createWebGL2 } from '../webgl/createContext';
import { createRainProgram, drawRain, type RainProgram } from '../webgl/rain';
import {
  createSnowProgram,
  drawSnow,
  loadSnowBackground,
  deleteSnowBackground,
  type SnowProgram,
} from '../webgl/snow';
import { snowBackgroundAssetName } from '../lib/snowBackgrounds';
import { Kk11VideoBg } from './Kk11VideoBg';

type Fallback = 'none' | 'motion' | 'webgl' | 'lost';

export function AtmosphereCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mode = useFlowStore((s) => s.atmosphereMode);
  const intensity = useFlowStore((s) => s.mixer.intensity01);
  const snowBackgroundId = useFlowStore((s) => s.snowBackgroundId);
  const isKk11 = mode === 'kk11';
  const modeRef = useRef(mode);
  const intensityRef = useRef(intensity);
  modeRef.current = mode;
  intensityRef.current = intensity;

  const reducedMotion = useReducedMotion();

  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const rainRef = useRef<RainProgram | null>(null);
  const snowRef = useRef<SnowProgram | null>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const resizeRafRef = useRef<number>(0);
  const snowBgTexRef = useRef<WebGLTexture | null>(null);
  const [fallback, setFallback] = useState<Fallback>('none');

  const fallbackMsg =
    fallback === 'motion'
      ? '已启用减少动态效果 — 静态背景'
      : fallback === 'lost'
        ? '上下文丢失 — 已切换静态背景'
        : 'GPU off — calm mode';

  const stopLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const gl = glRef.current;
    if (!canvas || !gl) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }, []);

  const scheduleResize = useCallback(() => {
    if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
    resizeRafRef.current = requestAnimationFrame(() => {
      resizeRafRef.current = 0;
      resizeCanvas();
    });
  }, [resizeCanvas]);

  const startRenderLoop = useCallback(
    (canvas: HTMLCanvasElement) => {
      stopLoop();
      startRef.current = performance.now();
      const loop = () => {
        const gl = glRef.current;
        const r = rainRef.current;
        const s = snowRef.current;
        if (!gl || !r || !s) return;
        const t = (performance.now() - startRef.current) / 1000;
        gl.disable(gl.DEPTH_TEST);
        const cw = canvas.width;
        const ch = canvas.height;
        const m = modeRef.current;
        const i = intensityRef.current;
        if (m === 'rain') {
          drawRain(gl, r, cw, ch, t, i);
        } else {
          drawSnow(gl, s, cw, ch, t, i, snowBgTexRef.current);
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    },
    [stopLoop]
  );

  useEffect(() => {
    if (isKk11 || reducedMotion) {
      setFallback(isKk11 ? 'none' : 'motion');
      stopLoop();
      if (glRef.current && snowBgTexRef.current) {
        deleteSnowBackground(glRef.current, snowBgTexRef.current);
      }
      snowBgTexRef.current = null;
      glRef.current = null;
      rainRef.current = null;
      snowRef.current = null;
      return () => {
        stopLoop();
      };
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const initGL = () => {
      const gl = createWebGL2(canvas);
      if (!gl) return false;
      const rain = createRainProgram(gl);
      const snow = createSnowProgram(gl);
      if (!rain || !snow) return false;
      glRef.current = gl;
      rainRef.current = rain;
      snowRef.current = snow;
      resizeCanvas();
      // Layout may still be 0×0 on first paint; sync after browser lays out flex/root
      requestAnimationFrame(() => {
        resizeCanvas();
        requestAnimationFrame(() => resizeCanvas());
      });
      startRenderLoop(canvas);
      return true;
    };

    const onLost = (e: Event) => {
      e.preventDefault();
      stopLoop();
      glRef.current = null;
      rainRef.current = null;
      snowRef.current = null;
      setFallback('lost');
    };

    const onRestored = () => {
      if (initGL()) {
        setFallback('none');
      } else {
        setFallback('webgl');
      }
    };

    canvas.addEventListener('webglcontextlost', onLost, false);
    canvas.addEventListener('webglcontextrestored', onRestored, false);

    if (!initGL()) {
      setFallback('webgl');
      return () => {
        stopLoop();
        canvas.removeEventListener('webglcontextlost', onLost);
        canvas.removeEventListener('webglcontextrestored', onRestored);
      };
    }

    setFallback('none');

    const ro = new ResizeObserver(() => scheduleResize());
    const parent = canvas.parentElement;
    if (parent) ro.observe(parent);

    return () => {
      stopLoop();
      ro.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      if (glRef.current && snowBgTexRef.current) {
        deleteSnowBackground(glRef.current, snowBgTexRef.current);
      }
      snowBgTexRef.current = null;
      glRef.current = null;
      rainRef.current = null;
      snowRef.current = null;
    };
  }, [isKk11, reducedMotion, stopLoop, resizeCanvas, scheduleResize, startRenderLoop]);

  useEffect(() => {
    if (isKk11 || reducedMotion || fallback !== 'none') return;
    const gl = glRef.current;
    if (!gl) return;
    let cancelled = false;
    const url = `${import.meta.env.BASE_URL}${snowBackgroundAssetName(snowBackgroundId)}`;
    loadSnowBackground(gl, url).then((tex) => {
      if (cancelled || glRef.current !== gl) {
        if (tex) deleteSnowBackground(gl, tex);
        return;
      }
      const prev = snowBgTexRef.current;
      if (prev) deleteSnowBackground(gl, prev);
      snowBgTexRef.current = tex;
    });
    return () => {
      cancelled = true;
    };
  }, [snowBackgroundId, isKk11, reducedMotion, fallback]);

  useEffect(() => {
    if (isKk11 || reducedMotion || fallback !== 'none') return;
    scheduleResize();
  }, [isKk11, reducedMotion, fallback, scheduleResize]);

  return (
    <div className="fs-atmosphere-wrap">
      {isKk11 && <Kk11VideoBg intensity01={intensity} reducedMotion={reducedMotion} />}
      {!isKk11 && <canvas ref={canvasRef} className="fs-atmosphere" aria-hidden />}
      {!isKk11 && fallback !== 'none' && (
        <div className="fs-fallback-stack" aria-hidden>
          <img className="fs-fallback-bg" src="/fallback-bg.svg" alt="" />
          <div className="fs-fallback-vignette" />
          <p className="fs-fallback-msg">{fallbackMsg}</p>
        </div>
      )}
    </div>
  );
}
