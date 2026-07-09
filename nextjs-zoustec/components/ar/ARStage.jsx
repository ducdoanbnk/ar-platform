'use client';

/**
 * ARStage — WebAR surface for the experience flow.
 *
 * Engine: MindAR (image tracking) + three.js on getUserMedia + WebGL only —
 * NO WebXR (unavailable in the iOS LINE WebView). This is the swappable
 * engine seam: when Zoustec ships their official engine, replace the mount
 * internals here; the page contract (props/onComplete) stays.
 *
 * Props:
 *   glbUrl, targetUrl, scale  — from task.ar_config
 *   onComplete()              — target held in view ~1.5s (successful scan)
 *   onStatus(state)           — 'initializing'|'camera-started'|'target-found'|'target-lost'|'completed'|'error'
 */

import { useEffect, useRef, useState } from 'react';
import { getLiff, resolveLiffId } from '../../lib/liff-client';

const DWELL_MS = 1500;

function arCapable() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

function externalBrowserUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set('openExternalBrowser', '1'); // honored by LINE's in-app browser, but NOT inside LIFF apps
  return url.toString();
}

/** Escape to the device's default browser. LINE ignores openExternalBrowser=1
 * on LIFF URLs, so inside the LIFF browser the only working path is
 * liff.openWindow({external: true}); the query param stays as fallback for
 * the plain LINE in-app browser and external browsers. */
async function openExternal() {
  const target = externalBrowserUrl();
  try {
    const liff = await getLiff(await resolveLiffId());
    if (liff?.isInClient?.()) {
      liff.openWindow({ url: target, external: true });
      return;
    }
  } catch { /* LIFF unavailable → plain navigation */ }
  window.location.href = target;
}

export default function ARStage({ glbUrl, targetUrl, scale = 0.4, onComplete, onStatus }) {
  const containerRef = useRef(null);
  const [error, setError] = useState('');
  const [unsupported, setUnsupported] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!glbUrl || !targetUrl) return;
    if (!arCapable()) { setUnsupported(true); onStatus?.('error'); return; }

    let disposed = false;
    let mindarThree = null;
    let dwellTimer = null;
    let completed = false;
    const emit = (s) => { if (!disposed) onStatus?.(s); };

    (async () => {
      emit('initializing');
      try {
        const mindMod = await import('mind-ar/dist/mindar-image-three.prod.js');
        const THREE = await import('three');
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        if (disposed) return;

        mindarThree = new mindMod.MindARThree({
          container: containerRef.current,
          imageTargetSrc: targetUrl,
          uiScanning: true,
          uiLoading: 'no',
        });
        const { renderer, scene, camera } = mindarThree;

        scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
        const dir = new THREE.DirectionalLight(0xffffff, 0.8);
        dir.position.set(0.5, 1, 1);
        scene.add(dir);

        const anchor = mindarThree.addAnchor(0);
        const gltf = await new GLTFLoader().loadAsync(glbUrl);
        if (disposed) return;
        const model = gltf.scene;
        model.scale.set(scale, scale, scale);
        anchor.group.add(model);
        let mixer = null;
        if (gltf.animations?.length) {
          mixer = new THREE.AnimationMixer(model);
          gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
        }

        anchor.onTargetFound = () => {
          emit('target-found');
          if (completed) return;
          dwellTimer = setTimeout(() => {
            completed = true;
            emit('completed');
            onComplete?.();
          }, DWELL_MS);
        };
        anchor.onTargetLost = () => {
          emit('target-lost');
          if (dwellTimer) { clearTimeout(dwellTimer); dwellTimer = null; }
        };

        await mindarThree.start(); // camera permission prompt happens here
        if (disposed) { await mindarThree.stop(); return; }
        emit('camera-started');

        const clock = new THREE.Clock();
        renderer.setAnimationLoop(() => {
          const dt = clock.getDelta();
          if (mixer) mixer.update(dt);       // animated GLB: play its clips
          else model.rotation.y += dt * 0.6; // static mesh: gentle idle spin
          renderer.render(scene, camera);
        });
      } catch (e) {
        if (disposed) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(/denied|permission|NotAllowed/i.test(msg)
          ? '相機權限被拒絕 — 請允許相機後重試'
          : `AR 啟動失敗：${msg.slice(0, 120)}`);
        emit('error');
      }
    })();

    return () => {
      disposed = true;
      if (dwellTimer) clearTimeout(dwellTimer);
      if (mindarThree) {
        try { mindarThree.renderer?.setAnimationLoop(null); } catch {}
        try { mindarThree.stop(); } catch {}
        try { mindarThree.renderer?.dispose?.(); } catch {}
      }
    };
  }, [glbUrl, targetUrl, scale, retryKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (unsupported || error) {
    return (
      <div style={{position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'14px', padding:'30px', textAlign:'center', zIndex:5}}>
        <div style={{color:'#fff', fontSize:'14px', fontWeight:'700'}}>{unsupported ? '此環境無法啟動 AR 相機' : error}</div>
        <div style={{display:'flex', gap:'10px'}}>
          {!unsupported && (
            <button onClick={() => { setError(''); setRetryKey((k) => k + 1); }} style={{padding:'10px 18px', borderRadius:'9999px', background:'#fff', color:'var(--primary-800)', fontSize:'13px', fontWeight:'700', border:'none', cursor:'pointer'}}>重試</button>
          )}
          <button onClick={openExternal} style={{padding:'10px 18px', borderRadius:'9999px', background:'rgba(255,255,255,.14)', color:'#fff', fontSize:'13px', fontWeight:'700', border:'1px solid rgba(255,255,255,.3)', cursor:'pointer'}}>在外部瀏覽器開啟</button>
        </div>
      </div>
    );
  }

  // MindAR injects <video> + canvas into this container.
  return <div ref={containerRef} style={{position:'absolute', inset:0, overflow:'hidden'}} />;
}
