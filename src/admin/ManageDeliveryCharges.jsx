import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ManageDeliveryCharges() {
  const [rows, setRows] = useState([]);
  const [edits, setEdits] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [savingAll, setSavingAll] = useState(false);

  async function load() {
    const { data } = await supabase.from('delivery_charges').select('*').order('position');
    setRows(data || []);
    setEdits({});
  }
  useEffect(() => { load(); }, []);

  function fieldValue(row, key) {
    return edits[row.id]?.[key] ?? row[key];
  }
  function setField(rowId, key, value) {
    setEdits((prev) => ({ ...prev, [rowId]: { ...prev[rowId], [key]: value } }));
  }

  async function saveRow(row) {
    const patch = edits[row.id];
    if (!patch) return;
    setSavingId(row.id);
    await supabase.from('delivery_charges').update({
      inside_city_fee: Number(patch.inside_city_fee ?? row.inside_city_fee) || 0,
      standard_fee: Number(patch.standard_fee ?? row.standard_fee) || 0,
    }).eq('id', row.id);
    setSavingId(null);
    load();
  }

  async function saveAll() {
    const dirtyIds = Object.keys(edits);
    if (dirtyIds.length === 0) return;
    setSavingAll(true);
    await Promise.all(dirtyIds.map((id) => {
      const row = rows.find((r) => r.id === id);
      const patch = edits[id];
      return supabase.from('delivery_charges').update({
        inside_city_fee: Number(patch.inside_city_fee ?? row.inside_city_fee) || 0,
        standard_fee: Number(patch.standard_fee ?? row.standard_fee) || 0,
      }).eq('id', id);
    }));
    setSavingAll(false);
    load();
  }

  const dirtyCount = Object.keys(edits).length;

  return (
    <div>
      <div className="admin-header"><h2>Delivery Charge Settings</h2></div>
      <p style={{ color: '#666', fontSize: 13, marginTop: -8 }}>
        Configure shipping fees based on the customer's Division at checkout. "Inside Major City" applies
        when the customer's District matches that division's main city (e.g. Dhaka district within Dhaka
        Division); "Standard Fee" applies everywhere else in that division.
      </p>

      <div className="admin-card">
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr><th>Division</th><th>Inside Major City (৳)</th><th>Standard Fee (৳)</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{row.division_name}</td>
                  <td>
                    <input
                      type="number" min="0" style={{ width: 100, padding: 6 }}
                      value={fieldValue(row, 'inside_city_fee')}
                      onChange={(e) => setField(row.id, 'inside_city_fee', e.target.value)}
                    />
                    {row.city_district_name && <span style={{ color: '#999', fontSize: 11, marginLeft: 6 }}>(Inside {row.city_district_name})</span>}
                  </td>
                  <td>
                    <input
                      type="number" min="0" style={{ width: 100, padding: 6 }}
                      value={fieldValue(row, 'standard_fee')}
                      onChange={(e) => setField(row.id, 'standard_fee', e.target.value)}
                    />
                    <span style={{ color: '#999', fontSize: 11, marginLeft: 6 }}>(Outside city)</span>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-outline" disabled={savingId === row.id} onClick={() => saveRow(row)}>
                      {savingId === row.id ? 'Saving…' : 'Save'}
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={4} style={{ color: '#999' }}>No divisions found — re-run the database migration.</td></tr>}
            </tbody>
          </table>
        </div>
        <button className="btn btn-teal" style={{ marginTop: 14 }} disabled={dirtyCount === 0 || savingAll} onClick={saveAll}>
          {savingAll ? 'Saving…' : `Save All Changes${dirtyCount > 0 ? ` (${dirtyCount})` : ''}`}
        </button>
      </div>
    </div>
  );
}
