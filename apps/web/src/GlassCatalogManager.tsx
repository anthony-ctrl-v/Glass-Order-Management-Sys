import { useState, type FormEvent } from "react";
import { api } from "./api";
import type { GlassCatalogEntry, GlassCatalogKind } from "./types";

const catalogKinds: GlassCatalogKind[] = [
  "GLASS_PRODUCT",
  "SURFACE_TREATMENT",
  "INTERLAYER_MATERIAL",
  "INTERLAYER_COLOR",
  "SPACER_TYPE",
  "SPACER_COLOR",
];

const catalogLabels: Record<GlassCatalogKind, string> = {
  GLASS_PRODUCT: "Glass products",
  SURFACE_TREATMENT: "Surface treatments",
  INTERLAYER_MATERIAL: "Interlayer materials",
  INTERLAYER_COLOR: "Interlayer colors",
  SPACER_TYPE: "Spacer types",
  SPACER_COLOR: "Spacer colors",
};

type Props = {
  entries: GlassCatalogEntry[];
  onChanged: () => void;
};

export function GlassCatalogManager({ entries, onChanged }: Props) {
  const [kind, setKind] = useState<GlassCatalogKind>("GLASS_PRODUCT");
  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [description, setDescription] = useState("");
  const [facilityWorkRequired, setFacilityWorkRequired] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function edit(entry: GlassCatalogEntry) {
    setEditingId(entry.id);
    setKind(entry.kind);
    setName(entry.name);
    setManufacturer(entry.manufacturer ?? "");
    setDescription(entry.description ?? "");
    setFacilityWorkRequired(entry.facilityWorkRequired);
    setError("");
    setNotice("");
  }

  function clearForm() {
    setEditingId(null);
    setName("");
    setManufacturer("");
    setDescription("");
    setFacilityWorkRequired(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const data = {
      kind,
      name,
      manufacturer: manufacturer || null,
      description: description || null,
      facilityWorkRequired: kind === "SURFACE_TREATMENT" && facilityWorkRequired,
      active: editingId ? entries.find((entry) => entry.id === editingId)?.active ?? true : true,
    };
    try {
      if (editingId) {
        await api.updateGlassCatalog(editingId, data);
        setNotice("Catalog entry updated.");
      } else {
        await api.createGlassCatalog(data);
        setNotice("Catalog entry added.");
      }
      clearForm();
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this catalog entry.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(entry: GlassCatalogEntry) {
    setError("");
    setNotice("");
    try {
      await api.updateGlassCatalog(entry.id, { active: !entry.active });
      setNotice(`${entry.name} ${entry.active ? "deactivated" : "reactivated"}.`);
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update this catalog entry.");
    }
  }

  return (
    <div className="catalog-layout">
      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">EDITABLE REFERENCE DATA</p><h2>{editingId ? "Edit catalog entry" : "Add catalog entry"}</h2></div></div>
        {error && <div className="alert error" role="alert">{error}</div>}
        {notice && <div className="alert success" role="status">{notice}</div>}
        <form className="form-stack" onSubmit={(event) => void submit(event)}>
          <label>Catalog<select value={kind} disabled={Boolean(editingId)} onChange={(event) => setKind(event.target.value as GlassCatalogKind)}>{catalogKinds.map((value) => <option value={value} key={value}>{catalogLabels[value]}</option>)}</select></label>
          <label>Name<input required maxLength={200} value={name} onChange={(event) => setName(event.target.value)} /></label>
          {kind === "GLASS_PRODUCT" && <label>Manufacturer <span className="optional">optional</span><input maxLength={200} value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} /></label>}
          <label>Description <span className="optional">optional</span><input maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          {kind === "SURFACE_TREATMENT" && <label className="checkbox-label"><input type="checkbox" checked={facilityWorkRequired} onChange={(event) => setFacilityWorkRequired(event.target.checked)} /> Requires facility work</label>}
          <button className="primary-button" disabled={saving}>{saving ? "Saving…" : editingId ? "Update entry" : "Add entry"}<span>→</span></button>
          {editingId && <button className="secondary-button" type="button" onClick={clearForm}>Cancel edit</button>}
        </form>
      </section>
      <section className="panel catalog-list-panel">
        <div className="panel-heading"><div><p className="eyebrow">GLASS SPECIFICATION LISTS</p><h2>Catalog entries</h2></div><span className="count-pill">{entries.length}</span></div>
        {catalogKinds.map((catalogKind) => {
          const group = entries.filter((entry) => entry.kind === catalogKind);
          return <section className="catalog-group" key={catalogKind}>
            <h3>{catalogLabels[catalogKind]} <span>{group.length}</span></h3>
            {group.length === 0 ? <p className="muted">No entries yet.</p> : <ul className="customer-list">
              {group.map((entry) => <li key={entry.id}>
                <span className={`catalog-status ${entry.active ? "active" : ""}`}>{entry.active ? "Active" : "Inactive"}</span>
                <span className="customer-info"><strong>{entry.name}</strong><small>{entry.manufacturer ?? entry.description ?? (entry.facilityWorkRequired ? "Requires facility work" : "—")}</small></span>
                <button className="edit-button" type="button" onClick={() => edit(entry)}>Edit</button>
                <button className="edit-button" type="button" onClick={() => void toggleActive(entry)}>{entry.active ? "Deactivate" : "Reactivate"}</button>
              </li>)}
            </ul>}
          </section>;
        })}
      </section>
    </div>
  );
}
