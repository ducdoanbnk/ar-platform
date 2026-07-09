'use client';

/**
 * /diag — device compatibility probe for the LIFF WebAR deliverable.
 *
 * Runs the same stack as the real AR flow (getUserMedia + WebGL + MindAR with
 * the demo target) and measures what the compatibility matrix needs:
 *   env    — UA, LINE app version (UA sniff, no liff.init needed), screen
 *   caps   — HTTPS, getUserMedia, WebGL1/2, GPU renderer, WebXR immersive-ar, WASM
 *   camera — open latency (ms), actual resolution
 *   engine — MindAR start latency, avg FPS over the bench window, long frames
 *
 * No auth, no backend calls: open https://liff.line.me/{id}/diag on any
 * device, tap 開始檢測, then 複製結果 and paste into the report.
 * `?auto=1` starts without the tap (used by the headless bench harness).
 */

import { useEffect, useRef, useState } from 'react';

const BENCH_MS = 8000;
const LONG_FRAME_MS = 50; // >50ms gap = visible stutter at 20fps

function sniffEnv() {
  const ua = navigator.userAgent;
  const line = ua.match(/Line\/([\d.]+)/i);
  const ios = ua.match(/OS (\d+[_\d]*) like Mac OS X/);
  const android = ua.match(/Android ([\d.]+)/);
  return {
    userAgent: ua,
    inLine: Boolean(line),
    lineVersion: line ? line[1] : null,
    os: ios ? `iOS ${ios[1].replace(/_/g, '.')}` : android ? `Android ${android[1]}` : navigator.platform || 'unknown',
    screen: `${window.screen.width}×${window.screen.height} @${window.devicePixelRatio}x`,
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    cores: navigator.hardwareConcurrency ?? null,
    deviceMemoryGB: navigator.deviceMemory ?? null,
    language: navigator.language,
  };
}

function webglInfo() {
  const out = { webgl1: false, webgl2: false, gpu: null };
  try {
    const c = document.createElement('canvas');
    const gl2 = c.getContext('webgl2');
    const gl = gl2 || c.getContext('webgl');
    out.webgl2 = Boolean(gl2);
    out.webgl1 = Boolean(gl);
    if (gl) {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      out.gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    }
  } catch { /* leave defaults */ }
  return out;
}

async function webxrInfo() {
  if (typeof navigator === 'undefined' || !navigator.xr) return { api: false, immersiveAr: false };
  try {
    const ok = await Promise.race([
      navigator.xr.isSessionSupported('immersive-ar'),
      new Promise((r) => setTimeout(() => r('timeout'), 3000)),
    ]);
    return { api: true, immersiveAr: ok === true, note: ok === 'timeout' ? 'isSessionSupported timeout' : undefined };
  } catch (e) {
    return { api: true, immersiveAr: false, note: String(e).slice(0, 80) };
  }
}

/** Row renderer: label + pass/fail/value chip. */
function Row({ label, ok, value }) {
  const color = ok === true ? '#6EE7B7' : ok === false ? '#FCA5A5' : '#E2E8F0';
  const mark = ok === true ? '✓' : ok === false ? '✗' : '·';
  return (
    <div style={{display:'flex', alignItems:'baseline', gap:'10px', padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,.08)'}}>
      <span style={{width:'15px', color, fontWeight:'800'}}>{mark}</span>
      <span style={{flex:'0 0 148px', color:'#94A3B8', fontSize:'12.5px', fontWeight:'600'}}>{label}</span>
      <span style={{flex:'1', color, fontSize:'12.5px', fontWeight:'700', wordBreak:'break-all'}}>{String(value ?? '—')}</span>
    </div>
  );
}

export default function Page() {
  const containerRef = useRef(null);
  const [state, setState] = useState('idle'); // idle | running | done
  const [step, setStep] = useState('');
  const [r, setR] = useState({});           // accumulated results
  const [copied, setCopied] = useState(false);

  async function run() {
    setState('running');
    setCopied(false);
    const acc = { ranAt: new Date().toISOString(), benchMs: BENCH_MS };

    // 1 · environment + static capabilities (sync, cheap)
    setStep('讀取環境資訊…');
    acc.env = sniffEnv();
    acc.caps = {
      https: window.isSecureContext,
      getUserMedia: Boolean(navigator.mediaDevices?.getUserMedia),
      ...webglInfo(),
      wasm: typeof WebAssembly !== 'undefined',
    };
    acc.webxr = await webxrInfo();
    setR({ ...acc });

    // 2 · camera open latency + resolution (own stream, released before MindAR)
    setStep('開啟相機（請允許權限）…');
    acc.camera = { ok: false };
    let stream = null;
    try {
      const t0 = performance.now();
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.setAttribute('playsinline', '');
      video.muted = true;
      await video.play();
      await new Promise((res, rej) => {
        if (video.readyState >= 2) return res();
        video.onloadeddata = res;
        setTimeout(() => rej(new Error('camera timeout (10s)')), 10000);
      });
      const track = stream.getVideoTracks()[0];
      const s = track.getSettings();
      acc.camera = {
        ok: true,
        openMs: Math.round(performance.now() - t0),
        resolution: `${s.width}×${s.height}`,
        label: track.label || null,
      };
    } catch (e) {
      acc.camera = { ok: false, error: String(e && e.name ? `${e.name}: ${e.message}` : e).slice(0, 140) };
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
    }
    setR({ ...acc });

    // 3 · MindAR bench: same engine/target as production; model rendered
    //     directly in front of the camera so GPU load is realistic even
    //     while the tracker is still searching for the target.
    setStep('啟動 AR 引擎並測量效能（約 10 秒）…');
    acc.engine = { ok: false };
    let mindarThree = null;
    if (acc.camera.ok && acc.caps.webgl1) {
      try {
        const t0 = performance.now();
        const mindMod = await import('mind-ar/dist/mindar-image-three.prod.js');
        const THREE = await import('three');
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const importMs = Math.round(performance.now() - t0);

        mindarThree = new mindMod.MindARThree({
          container: containerRef.current,
          imageTargetSrc: '/targets/demo.mind',
          uiScanning: false,
          uiLoading: 'no',
        });
        const { renderer, scene, camera } = mindarThree;
        scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));

        const gltf = await new GLTFLoader().loadAsync('/models/mascot.glb');
        const model = gltf.scene;
        model.scale.set(0.25, 0.25, 0.25);
        model.position.set(0, -0.3, -1.2); // pinned in front of the camera
        scene.add(model);
        let mixer = null;
        if (gltf.animations?.length) {
          mixer = new THREE.AnimationMixer(model);
          gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
        }

        const t1 = performance.now();
        await mindarThree.start();
        const startMs = Math.round(performance.now() - t1);

        let found = false;
        try { mindarThree.addAnchor(0).onTargetFound = () => { found = true; }; } catch { /* bench works without anchor */ }

        // measure BENCH_MS of the real render+track loop
        const clock = new THREE.Clock();
        let frames = 0, longFrames = 0, worst = 0, last = performance.now();
        await new Promise((done) => {
          const t2 = performance.now();
          renderer.setAnimationLoop(() => {
            const now = performance.now();
            const gap = now - last;
            last = now;
            frames += 1;
            if (frames > 1) {
              if (gap > LONG_FRAME_MS) longFrames += 1;
              if (gap > worst) worst = gap;
            }
            const dt = clock.getDelta();
            if (mixer) mixer.update(dt);
            model.rotation.y += dt * 0.8;
            renderer.render(scene, camera);
            if (now - t2 >= BENCH_MS) { renderer.setAnimationLoop(null); done(); }
          });
        });

        acc.engine = {
          ok: true,
          importMs,
          startMs,
          avgFps: Math.round((frames / BENCH_MS) * 1000),
          longFrames,
          worstGapMs: Math.round(worst),
          targetFound: found,
          heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
        };
      } catch (e) {
        acc.engine = { ok: false, error: String(e instanceof Error ? e.message : e).slice(0, 140) };
      } finally {
        if (mindarThree) {
          try { mindarThree.renderer?.setAnimationLoop(null); } catch {}
          try { mindarThree.stop(); } catch {}
          try { mindarThree.renderer?.dispose?.(); } catch {}
        }
        if (containerRef.current) containerRef.current.innerHTML = '';
      }
    } else {
      acc.engine = { ok: false, error: acc.camera.ok ? 'WebGL 不可用' : '相機未開啟，略過引擎測試' };
    }

    // 4 · verdict for the matrix: 達成 / 勉強可用 / 未達成
    const fps = acc.engine.avgFps || 0;
    acc.verdict = acc.camera.ok && acc.engine.ok && fps >= 24 ? '達成'
      : acc.camera.ok && acc.engine.ok && fps >= 15 ? '勉強可用'
      : '未達成';

    setR({ ...acc });
    window.__diagResult = acc; // headless harness reads this
    setStep('');
    setState('done');
  }

  // ?auto=1 → start immediately (headless bench; camera permission pre-granted)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('auto') === '1') run();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function copy() {
    const text = JSON.stringify(r, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // clipboard API blocked → legacy path
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      setCopied(true);
    }
  }

  const done = state === 'done';
  return (
    <div style={{minHeight:'100dvh', background:'#0B1620', color:'#fff', padding:'22px 18px calc(30px + env(safe-area-inset-bottom, 0px))', fontFamily:'inherit'}}>
      <div style={{maxWidth:'520px', margin:'0 auto'}}>
        <div style={{fontSize:'12px', fontWeight:'700', letterSpacing:'.12em', color:'#6FCDE8'}}>ZOUSTEC · 相容性檢測</div>
        <div style={{fontSize:'22px', fontWeight:'800', marginTop:'6px'}}>WebAR 裝置檢測</div>
        <div style={{fontSize:'13px', color:'#94A3B8', marginTop:'6px', lineHeight:'1.55'}}>
          此頁會開啟相機並執行與正式活動相同的 AR 引擎約 10 秒，測量此裝置的支援度與效能。完成後請點「複製結果」回傳。
        </div>

        {state !== 'running' && (
          <button onClick={run} style={{marginTop:'16px', width:'100%', height:'48px', borderRadius:'12px', border:'none', background:'#0E7490', color:'#fff', fontSize:'15px', fontWeight:'800', cursor:'pointer'}}>
            {done ? '重新檢測' : '開始檢測'}
          </button>
        )}
        {state === 'running' && (
          <div style={{marginTop:'16px', padding:'12px 14px', borderRadius:'12px', background:'rgba(14,116,144,.25)', border:'1px solid rgba(14,116,144,.6)', fontSize:'13px', fontWeight:'700', textAlign:'center'}}>{step || '檢測中…'}</div>
        )}

        {/* MindAR mounts its video/canvas here during the bench */}
        <div ref={containerRef} style={{position:'relative', width:'100%', height: state === 'running' ? '230px' : '0px', marginTop: state === 'running' ? '14px' : '0', borderRadius:'14px', overflow:'hidden', background:'#000', transition:'height .2s'}} />

        {r.env && (
          <div style={{marginTop:'18px'}}>
            <div style={{fontSize:'13px', fontWeight:'800', color:'#6FCDE8', margin:'14px 0 4px'}}>環境</div>
            <Row label="作業系統" value={r.env.os} />
            <Row label="LINE App 內" ok={r.env.inLine} value={r.env.inLine ? `是（LINE ${r.env.lineVersion}）` : '否（外部瀏覽器）'} />
            <Row label="螢幕" value={`${r.env.screen} · 視窗 ${r.env.viewport}`} />
            <Row label="CPU 核心 / RAM" value={`${r.env.cores ?? '?'} 核 / ${r.env.deviceMemoryGB ? r.env.deviceMemoryGB + 'GB' : '不提供'}`} />

            <div style={{fontSize:'13px', fontWeight:'800', color:'#6FCDE8', margin:'14px 0 4px'}}>功能支援</div>
            <Row label="HTTPS 安全環境" ok={r.caps.https} value={r.caps.https ? '是' : '否 — 相機無法使用'} />
            <Row label="getUserMedia" ok={r.caps.getUserMedia} value={r.caps.getUserMedia ? '支援' : '不支援'} />
            <Row label="WebGL / WebGL2" ok={r.caps.webgl1} value={`${r.caps.webgl1 ? 'WebGL ✓' : 'WebGL ✗'} · ${r.caps.webgl2 ? 'WebGL2 ✓' : 'WebGL2 ✗'}`} />
            <Row label="GPU" value={r.caps.gpu} />
            <Row label="WebXR immersive-ar" ok={r.webxr?.immersiveAr} value={r.webxr?.api ? (r.webxr.immersiveAr ? '支援' : '不支援（API 存在）') : '無 API（預期 — LIFF 內無 WebXR）'} />
            <Row label="WebAssembly" ok={r.caps.wasm} value={r.caps.wasm ? '支援' : '不支援'} />
          </div>
        )}

        {r.camera && (
          <div>
            <div style={{fontSize:'13px', fontWeight:'800', color:'#6FCDE8', margin:'14px 0 4px'}}>相機</div>
            <Row label="開啟相機" ok={r.camera.ok} value={r.camera.ok ? `成功 · ${r.camera.openMs}ms` : r.camera.error} />
            {r.camera.ok && <Row label="解析度" value={r.camera.resolution} />}
          </div>
        )}

        {r.engine && (
          <div>
            <div style={{fontSize:'13px', fontWeight:'800', color:'#6FCDE8', margin:'14px 0 4px'}}>AR 引擎（MindAR — 與正式活動相同）</div>
            <Row label="引擎啟動" ok={r.engine.ok} value={r.engine.ok ? `載入 ${r.engine.importMs}ms · 啟動 ${r.engine.startMs}ms` : r.engine.error} />
            {r.engine.ok && (
              <>
                <Row label="平均 FPS" ok={r.engine.avgFps >= 24} value={`${r.engine.avgFps} fps（${BENCH_MS / 1000} 秒平均）`} />
                <Row label="卡頓幀 (>50ms)" ok={r.engine.longFrames <= 10} value={`${r.engine.longFrames} 次 · 最長 ${r.engine.worstGapMs}ms`} />
                {r.engine.heapMB != null && <Row label="JS 記憶體" value={`${r.engine.heapMB} MB`} />}
              </>
            )}
          </div>
        )}

        {done && (
          <div style={{marginTop:'20px', padding:'14px', borderRadius:'14px', background: r.verdict === '達成' ? 'rgba(16,185,129,.16)' : r.verdict === '勉強可用' ? 'rgba(245,158,11,.16)' : 'rgba(239,68,68,.16)', border:`1px solid ${r.verdict === '達成' ? 'rgba(16,185,129,.55)' : r.verdict === '勉強可用' ? 'rgba(245,158,11,.55)' : 'rgba(239,68,68,.55)'}`, textAlign:'center'}}>
            <div style={{fontSize:'13px', color:'#94A3B8', fontWeight:'700'}}>檢測結論</div>
            <div style={{fontSize:'24px', fontWeight:'800', marginTop:'4px', color: r.verdict === '達成' ? '#6EE7B7' : r.verdict === '勉強可用' ? '#FCD34D' : '#FCA5A5'}}>{r.verdict}</div>
            <button onClick={copy} style={{marginTop:'12px', width:'100%', height:'44px', borderRadius:'11px', border:'1px solid rgba(255,255,255,.25)', background:'rgba(255,255,255,.1)', color:'#fff', fontSize:'14px', fontWeight:'800', cursor:'pointer'}}>
              {copied ? '已複製 ✓' : '複製結果'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
