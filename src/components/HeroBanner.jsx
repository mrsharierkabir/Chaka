import { useEffect, useState } from 'react';

export default function HeroBanner({ banners }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners]);

  function prev() {
    setIndex((i) => (i - 1 + banners.length) % banners.length);
  }
  function next() {
    setIndex((i) => (i + 1) % banners.length);
  }

  if (!banners.length) {
    return (
      <div className="banner">
        <div className="banner-empty">No banners yet — add one from the Admin Panel</div>
      </div>
    );
  }

  return (
    <div className="banner">
      {banners.map((b, i) => (
        <div className={`banner-slide ${i === index ? 'active' : ''}`} key={b.id}>
          <a href={b.link_url || undefined}>
            <img src={b.image_url} alt={b.headline || 'banner'} />
          </a>
          {(b.headline || b.subheadline) && (
            <div className="banner-caption">
              {b.headline && <h2>{b.headline}</h2>}
              {b.subheadline && <p>{b.subheadline}</p>}
            </div>
          )}
        </div>
      ))}
      {banners.length > 1 && (
        <>
          <button className="banner-arrow left" onClick={prev}>‹</button>
          <button className="banner-arrow right" onClick={next}>›</button>
          <div className="banner-dots">
            {banners.map((b, i) => (
              <span key={b.id} className={i === index ? 'active' : ''} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
