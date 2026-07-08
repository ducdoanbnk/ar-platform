'use client';

import { useEffect, useRef } from 'react';

/**
 * In-page QR scanner — bước 1 của nhiệm vụ QR/hybrid (spec §V: quét QR ở
 * standee hiện trường). LIFF scanCodeV2 không khả dụng ổn định trên mọi
 * client (đặc biệt external browser / một số bản LINE iOS) nên tự quét bằng
 * getUserMedia + jsQR — đúng bộ ràng buộc camera mà MindAR đã dùng, nghĩa là
 * chạy được ở mọi nơi màn AR chạy được.
 */
export default function QrScanner({ onResult, onError }) {
  const videoRef = useRef(null);
  // Callbacks in refs: camera khởi động một lần, không re-init theo render.
  const cbRef = useRef({ onResult, onError });
  cbRef.current = { onResult, onError };

  useEffect(() => {
    let stream;
    let timer;
    let stopped = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    (async () => {
      try {
        const jsQR = (await import('jsqr')).default;
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        timer = setInterval(() => {
          if (stopped || !video.videoWidth) return;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
          if (hit?.data) cbRef.current.onResult?.(hit.data);
        }, 280);
      } catch (e) {
        if (!stopped) cbRef.current.onError?.(e);
      }
    })();

    return () => {
      stopped = true;
      clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <video
      ref={videoRef}
      playsInline
      muted
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
}
