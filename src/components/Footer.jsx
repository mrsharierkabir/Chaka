import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useSite } from '../context/SiteContext';

export default function Footer() {
  const { settings } = useSite();
  const [links, setLinks] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from('footer_links').select('*').eq('section', 'quick_links').order('position').then(({ data }) => setLinks(data || []));
  }, []);

  // Internal links use client-side navigation (no full page reload), so they
  // work reliably no matter how the site is hosted.
  function go(path) {
    navigate(path);
    window.scrollTo(0, 0);
  }

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <h4>{settings.logo_text_1} {settings.logo_text_2}</h4>
          <p style={{ fontSize: 13, color: '#555', maxWidth: 320 }}>{settings.footer_about}</p>
        </div>
        <div>
          <h5>Quick Links</h5>
          <ul>
            {links.length === 0 && <li>Home</li>}
            {links.map((l) => (
              <li key={l.id}>
                {l.url?.startsWith('/') ? <a onClick={() => go(l.url)}>{l.label}</a> : <a href={l.url} target="_blank" rel="noreferrer">{l.label}</a>}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h5>Policies</h5>
          <ul>
            <li><a onClick={() => go('/terms')}>Terms & Conditions</a></li>
            <li><a onClick={() => go('/privacy')}>Privacy Policy</a></li>
            <li><a onClick={() => go('/returns')}>Returns & Refunds</a></li>
          </ul>
        </div>
      </div>
      <div className="container footer-bottom">{settings.footer_copyright}</div>
    </footer>
  );
}
