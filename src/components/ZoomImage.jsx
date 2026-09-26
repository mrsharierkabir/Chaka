import { useEffect, useRef, useState } from 'react';

export default function ZoomImage({ src, alt = '', zoom = 2.2 }) {
  const ref = useRef(null);
  const [canHover, setCanHover] = useState(false);
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    // Only devices with a real pointer (mouse/trackpad) get the zoom effect —
    // on touch devices this just renders a plain, simple image.
    setCanHover(window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  }, []);

  if (!canHover) {
    return <img src={src} alt={alt} className="product-plain-image" />;
  }

  // Uses the container's own bounding box to turn the cursor position into a
  // 0–100% coordinate — this is what CSS background-position then uses to
  // pan, and percentages are naturally clamped to the image's own edges, so
  // it can never show blank space beyond the container.
  function updateFromPoint(clientX, clientY) {
    const rect = ref.current.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    setPos({ x, y });
  }

  function onMouseEnter(e) {
    setActive(true);
    updateFromPoint(e.clientX, e.clientY);
  }
  function onMouseMove(e) {
    updateFromPoint(e.clientX, e.clientY);
  }
  function onMouseLeave() {
    setActive(false);
    setPos({ x: 50, y: 50 });
  }

  return (
    <div
      ref={ref}
      className={`zoom-image ${active ? 'zoom-active' : ''}`}
      role="img"
      aria-label={alt}
      onMouseEnter={onMouseEnter}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{
        backgroundImage: `url(${src})`,
        backgroundPosition: `${pos.x}% ${pos.y}%`,
        backgroundSize: active ? `${zoom * 100}%` : '100%',
      }}
    />
  );
}
