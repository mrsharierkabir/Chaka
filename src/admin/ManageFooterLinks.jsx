import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ManageFooterLinks() {
  const [links, setLinks] = useState([]);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('#');

  async function load() {
    const { data } = await supabase.from('footer_links').select('*').eq('section', 'quick_links').order('position');
    setLinks(data || []);
  }
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    if (!label.trim()) return;
    await supabase.from('footer_links').insert({ section: 'quick_links', label, url, position: links.length });
    setLabel(''); setUrl('#');
    load();
  }
  async function remove(id) {
    await supabase.from('footer_links').delete().eq('id', id);
    load();
  }

  return (
    <div>
      <div className="admin-header"><h2>Footer Links</h2></div>
      <p style={{ color: '#666', fontSize: 13 }}>
        This controls the "Quick Links" column only. The "Policies" column always shows
        Terms & Conditions, Privacy Policy, and Returns & Refunds — edit their content
        from <strong>Policy Pages</strong> in the sidebar.
      </p>

      <div className="admin-card">
        <h4 style={{ marginTop: 0 }}>Quick Links</h4>
        <form onSubmit={add} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} style={{ flex: 1, padding: 8, border: '1px solid var(--border)', borderRadius: 12 }} />
          <input placeholder="URL" value={url} onChange={(e) => setUrl(e.target.value)} style={{ flex: 1, padding: 8, border: '1px solid var(--border)', borderRadius: 12 }} />
          <button className="btn btn-teal">Add</button>
        </form>
        <div className="table-scroll">
            <table className="admin-table">
            <tbody>
              {links.map((l) => (
                <tr key={l.id}>
                  <td>{l.label}</td>
                  <td style={{ color: '#999' }}>{l.url}</td>
                  <td><button className="btn btn-sm btn-danger" onClick={() => remove(l.id)}>Delete</button></td>
                </tr>
              ))}
              {links.length === 0 && <tr><td style={{ color: '#999' }}>None yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
