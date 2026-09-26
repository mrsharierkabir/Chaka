import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function RotatingTitle() {
  const [titles, setTitles] = useState([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('titles')
        .select('*')
        .eq('active', true)
        .order('position', { ascending: true });
      setTitles(data || []);
    }
    load();
  }, []);

  useEffect(() => {
    if (titles.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % titles.length), 5000);
    return () => clearInterval(t);
  }, [titles]);

  if (!titles.length) return null;

  return (
    <div className="title-strip">
      <span key={titles[index].id}>{titles[index].text}</span>
    </div>
  );
}
