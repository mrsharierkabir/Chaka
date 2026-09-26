import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ManageTitles() {
  const [titles, setTitles] = useState([]);
  const [text, setText] = useState('');

  async function load() {
    const { data } = await supabase.from('titles').select('*').order('position');
    setTitles(data || []);
  }
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    if (!text.trim()) return;
    await supabase.from('titles').insert({ text, position: titles.length, active: true });
    setText('');
    load();
  }

  async function toggleActive(t) {
    await supabase.from('titles').update({ active: !t.active }).eq('id', t.id);
    load();
  }

  async function remove(id) {
    await supabase.from('titles').delete().eq('id', id);
    load();
  }

  async function updateText(id, newText) {
    await supabase.from('titles').update({ text: newText }).eq('id', id);
    load();
  }

  return (
    <div>
      <div className="admin-header"><h2>Rotating Titles</h2></div>
      <p style={{ color: '#666', fontSize: 13 }}>Shown as a strip below the header; each active title rotates automatically every 5 seconds.</p>
      <form className="admin-card" onSubmit={add} style={{ display: 'flex', gap: 10 }}>
        <input style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6 }} placeholder="New announcement text" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn btn-teal">Add</button>
      </form>
      <div className="admin-card">
        <div className="table-scroll">
            <table className="admin-table">
            <thead><tr><th>Text</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {titles.map((t) => (
                <tr key={t.id}>
                  <td><input defaultValue={t.text} onBlur={(e) => e.target.value !== t.text && updateText(t.id, e.target.value)} style={{ width: '100%', border: '1px solid transparent', padding: 4 }} onFocus={(e) => e.target.style.border = '1px solid var(--border)'} /></td>
                  <td><input type="checkbox" checked={t.active} onChange={() => toggleActive(t)} /></td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => remove(t.id)}>Delete</button></td>
                </tr>
              ))}
              {titles.length === 0 && <tr><td colSpan={3} style={{ color: '#999' }}>No titles yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
