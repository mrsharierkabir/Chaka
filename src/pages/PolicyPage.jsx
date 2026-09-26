import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function ContentBlock({ content }) {
  const lines = (content || '').split('\n').filter((l) => l.trim() !== '');
  const isBulleted = lines.length > 0 && lines.every((l) => /^[-•]/.test(l.trim()));
  if (isBulleted) {
    return (
      <ul className="policy-bullets">
        {lines.map((l, i) => <li key={i}>{l.replace(/^[-•]\s*/, '')}</li>)}
      </ul>
    );
  }
  return <p className="policy-paragraph">{content}</p>;
}

function PolicyHero({ title }) {
  return (
    <div className="policy-hero">
      <h1>{title}</h1>
      <p>Effective date: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
    </div>
  );
}

export default function PolicyPage({ page, title, layout = 'stacked' }) {
  const [sections, setSections] = useState([]);

  useEffect(() => {
    supabase.from('policy_sections').select('*').eq('page', page).order('position').then(({ data }) => setSections(data || []));
  }, [page]);

  if (layout === 'toc') {
    return (
      <div className="policy-page">
        <PolicyHero title={title} />
        <div className="container policy-toc-layout">
          <aside className="policy-toc">
            <h4>Table of Contents</h4>
            {sections.map((s, i) => (
              <a key={s.id} href={`#section-${i}`}>{i + 1}. {s.title}</a>
            ))}
            {sections.length === 0 && <p className="policy-empty">Nothing added yet.</p>}
          </aside>
          <div className="policy-sections">
            {sections.map((s, i) => (
              <div className="policy-card" id={`section-${i}`} key={s.id}>
                <h3>{i + 1}. {s.title}</h3>
                <ContentBlock content={s.content} />
              </div>
            ))}
            {sections.length === 0 && <p className="policy-empty">This page hasn't been filled in yet.</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="policy-page">
      <PolicyHero title={title} />
      <div className="container policy-single-layout">
        {sections.map((s) => (
          <div className="policy-card" key={s.id}>
            <h3>{s.title}</h3>
            <ContentBlock content={s.content} />
          </div>
        ))}
        {sections.length === 0 && <p className="policy-empty" style={{ textAlign: 'center' }}>This page hasn't been filled in yet.</p>}
      </div>
    </div>
  );
}
