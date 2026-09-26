import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const TABS = [
  { key: 'terms', label: 'Terms & Conditions' },
  { key: 'privacy', label: 'Privacy Policy' },
  { key: 'returns', label: 'Returns & Refunds' },
];

export default function ManagePolicies() {
  const [tab, setTab] = useState('terms');
  const [sections, setSections] = useState([]);
  const [form, setForm] = useState({ title: '', content: '' });
  const [editingId, setEditingId] = useState(null);

  async function load() {
    const { data } = await supabase.from('policy_sections').select('*').eq('page', tab).order('position');
    setSections(data || []);
  }
  useEffect(() => { load(); setForm({ title: '', content: '' }); setEditingId(null); }, [tab]);

  async function save(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (editingId) {
      await supabase.from('policy_sections').update(form).eq('id', editingId);
    } else {
      await supabase.from('policy_sections').insert({ ...form, page: tab, position: sections.length });
    }
    setForm({ title: '', content: '' });
    setEditingId(null);
    load();
  }

  function edit(s) {
    setForm({ title: s.title, content: s.content });
    setEditingId(s.id);
  }

  async function remove(id) {
    await supabase.from('policy_sections').delete().eq('id', id);
    load();
  }

  async function move(index, dir) {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const a = sections[index], b = sections[target];
    await supabase.from('policy_sections').update({ position: b.position }).eq('id', a.id);
    await supabase.from('policy_sections').update({ position: a.position }).eq('id', b.id);
    load();
  }

  return (
    <div>
      <div className="admin-header"><h2>Policy Pages</h2></div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? 'btn btn-teal btn-sm' : 'btn btn-outline btn-sm'} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      <form className="admin-card" onSubmit={save}>
        <h4 style={{ marginTop: 0 }}>{editingId ? 'Edit Section' : 'Add Section'}</h4>
        <div className="admin-form-row">
          <label>Heading{tab === 'terms' ? ' (used both in the table of contents and as the numbered heading)' : ''}</label>
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="admin-form-row">
          <label>Content — start every line with "-" for a bulleted list, or leave plain for a paragraph</label>
          <textarea rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        </div>
        <button className="btn btn-teal">{editingId ? 'Update Section' : 'Add Section'}</button>
        {editingId && <button type="button" className="btn btn-outline" style={{ marginLeft: 8 }} onClick={() => { setForm({ title: '', content: '' }); setEditingId(null); }}>Cancel</button>}
      </form>

      <div className="admin-card">
        <div className="table-scroll">
            <table className="admin-table">
            <thead><tr><th>#</th><th>Heading</th><th>Order</th><th></th></tr></thead>
            <tbody>
              {sections.map((s, i) => (
                <tr key={s.id}>
                  <td>{i + 1}</td>
                  <td>{s.title}</td>
                  <td>
                    <button className="btn-sm btn-outline" onClick={() => move(i, -1)}>↑</button>{' '}
                    <button className="btn-sm btn-outline" onClick={() => move(i, 1)}>↓</button>
                  </td>
                  <td className="row-actions">
                    <button className="btn btn-sm btn-outline" onClick={() => edit(s)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(s.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {sections.length === 0 && <tr><td colSpan={4} style={{ color: '#999' }}>No sections yet for this page</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
