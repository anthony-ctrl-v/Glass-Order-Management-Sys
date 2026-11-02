import { Fragment, useEffect, useState, type FormEvent } from "react";
import { api } from "./api";
import { formatInches } from "./format-inches";
import type { GlassCatalogEntry, GlassCatalogKind, GlassUnit, GlassUnitInput } from "./types";

type Props = {
  orderItemId: string;
  unit: GlassUnit | null;
  catalogs: GlassCatalogEntry[];
  onSaved: () => void;
};

const kindNames: Record<GlassCatalogKind, string> = {
  GLASS_PRODUCT: "Glass product",
  SURFACE_TREATMENT: "Surface treatment",
  INTERLAYER_MATERIAL: "Interlayer material",
  INTERLAYER_COLOR: "Interlayer color",
  SPACER_TYPE: "Spacer type",
  SPACER_COLOR: "Spacer color",
};

function entriesOf(catalogs: GlassCatalogEntry[], kind: GlassCatalogKind) {
  return catalogs.filter((entry) => entry.kind === kind);
}

function newPane(catalogs: GlassCatalogEntry[]): GlassUnitInput["panes"][number] {
  return {
    glassProductId: entriesOf(catalogs, "GLASS_PRODUCT").find((entry) => entry.active)?.id ?? "",
    width: 12,
    height: 12,
    thickness: 0.25,
    heatTreatment: "NONE",
    hasHoles: false,
    flatPolish: false,
    bevel: false,
    surfaces: [{ side: "A", treatmentIds: [] }, { side: "B", treatmentIds: [] }],
  };
}

function blankDraft(catalogs: GlassCatalogEntry[]): GlassUnitInput {
  return {
    overallWidth: 12,
    overallHeight: 12,
    construction: "MONOLITHIC",
    notes: "",
    panes: [newPane(catalogs)],
    interlayers: [],
    cavities: [],
  };
}

function draftFromUnit(unit: GlassUnit): GlassUnitInput {
  return {
    overallWidth: Number(unit.overallWidth),
    overallHeight: Number(unit.overallHeight),
    construction: unit.construction,
    notes: unit.notes ?? "",
    panes: unit.panes.map((pane) => ({
      glassProductId: pane.glassProductId,
      width: Number(pane.width),
      height: Number(pane.height),
      thickness: Number(pane.thickness),
      heatTreatment: pane.heatTreatment,
      hasHoles: pane.hasHoles,
      flatPolish: pane.flatPolish,
      bevel: pane.bevel,
      surfaces: pane.surfaces.map((surface) => ({
        side: surface.side,
        treatmentIds: surface.treatments.map((treatment) => treatment.treatmentId),
      })),
    })),
    interlayers: unit.interlayers.map((layer) => ({
      gapNumber: layer.gapNumber,
      sheetNumber: layer.sheetNumber,
      materialId: layer.materialId,
      colorId: layer.colorId,
      thickness: Number(layer.thickness),
      brand: layer.brand ?? "",
    })),
    cavities: unit.cavities.map((cavity) => ({
      gapNumber: cavity.gapNumber,
      spacerTypeId: cavity.spacerTypeId,
      spacerColorId: cavity.spacerColorId,
      width: Number(cavity.width),
      gasFilled: cavity.gasFilled,
    })),
  };
}

function defaultInterlayer(catalogs: GlassCatalogEntry[], gapNumber: number, sheetNumber: number) {
  return {
    gapNumber,
    sheetNumber,
    materialId: entriesOf(catalogs, "INTERLAYER_MATERIAL").find((entry) => entry.active)?.id ?? "",
    colorId: entriesOf(catalogs, "INTERLAYER_COLOR").find((entry) => entry.active)?.id ?? "",
    thickness: 0.03,
    brand: "",
  };
}

function defaultCavity(catalogs: GlassCatalogEntry[], gapNumber: number) {
  return {
    gapNumber,
    spacerTypeId: entriesOf(catalogs, "SPACER_TYPE").find((entry) => entry.active)?.id ?? "",
    spacerColorId: entriesOf(catalogs, "SPACER_COLOR").find((entry) => entry.active)?.id ?? "",
    width: 0.5,
    gasFilled: false,
  };
}

function resizeForConstruction(
  current: GlassUnitInput,
  construction: GlassUnitInput["construction"],
  paneCount: number,
  catalogs: GlassCatalogEntry[],
): GlassUnitInput {
  const count = construction === "MONOLITHIC" ? 1 : Math.max(2, Math.min(20, paneCount));
  const panes = Array.from({ length: count }, (_, index) => current.panes[index] ?? newPane(catalogs));
  const gapCount = count - 1;
  const laminated = construction === "LAMINATED";
  const insulated = construction === "INSULATED";
  const laminatedInsulated = construction === "LAMINATED_INSULATED";
  const interlayers = laminated || laminatedInsulated
    ? Array.from({ length: gapCount }, (_, gapIndex) => {
        const gapNumber = gapIndex + 1;
        const existing = current.interlayers.filter((layer) => layer.gapNumber === gapNumber);
        return (existing.length || laminatedInsulated ? existing : [defaultInterlayer(catalogs, gapNumber, 1)])
          .map((layer, sheetIndex) => ({ ...layer, gapNumber, sheetNumber: sheetIndex + 1 }));
      }).flat()
    : [];
  const cavities = insulated || laminatedInsulated
    ? Array.from({ length: gapCount }, (_, gapIndex) => {
        const gapNumber = gapIndex + 1;
        const existing = current.cavities.find((cavity) => cavity.gapNumber === gapNumber);
        return existing ?? (laminatedInsulated ? undefined : defaultCavity(catalogs, gapNumber));
      })
        .filter((cavity): cavity is NonNullable<typeof cavity> => cavity !== undefined)
    : [];
  return { ...current, construction, panes, interlayers, cavities };
}

function CatalogSelect({
  catalogs, kind, value, onChange,
}: {
  catalogs: GlassCatalogEntry[];
  kind: GlassCatalogKind;
  value: string;
  onChange: (value: string) => void;
}) {
  const entries = entriesOf(catalogs, kind);
  return (
    <select required value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Select {kindNames[kind].toLowerCase()}</option>
      {entries.map((entry) => (
        <option key={entry.id} value={entry.id} disabled={!entry.active && entry.id !== value}>
          {entry.name}{entry.active ? "" : " (inactive)"}
        </option>
      ))}
    </select>
  );
}

export function GlassUnitEditor({ orderItemId, unit, catalogs, onSaved }: Props) {
  const [draft, setDraft] = useState<GlassUnitInput>(() => unit ? draftFromUnit(unit) : blankDraft(catalogs));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setDraft(unit ? draftFromUnit(unit) : blankDraft(catalogs));
    setError("");
    setNotice("");
  }, [unit, orderItemId, catalogs]);

  function updatePane(index: number, patch: Partial<GlassUnitInput["panes"][number]>) {
    setDraft((current) => ({
      ...current,
      panes: current.panes.map((pane, paneIndex) => paneIndex === index ? { ...pane, ...patch } : pane),
    }));
  }

  function updateInterlayer(index: number, patch: Partial<GlassUnitInput["interlayers"][number]>) {
    setDraft((current) => ({
      ...current,
      interlayers: current.interlayers.map((layer, layerIndex) => layerIndex === index ? { ...layer, ...patch } : layer),
    }));
  }

  function updateCavity(index: number, patch: Partial<GlassUnitInput["cavities"][number]>) {
    setDraft((current) => ({
      ...current,
      cavities: current.cavities.map((cavity, cavityIndex) => cavityIndex === index ? { ...cavity, ...patch } : cavity),
    }));
  }

  function toggleTreatment(paneIndex: number, side: "A" | "B", treatmentId: string) {
    setDraft((current) => ({
      ...current,
      panes: current.panes.map((pane, index) => index !== paneIndex ? pane : {
        ...pane,
        surfaces: pane.surfaces.map((surface) => surface.side !== side ? surface : {
          ...surface,
          treatmentIds: surface.treatmentIds.includes(treatmentId)
            ? surface.treatmentIds.filter((id) => id !== treatmentId)
            : [...surface.treatmentIds, treatmentId],
        }),
      }),
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api.saveGlassUnit(orderItemId, draft);
      setNotice("Glass specification saved.");
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the glass specification.");
    } finally {
      setSaving(false);
    }
  }

  const gaps = Array.from({ length: Math.max(0, draft.panes.length - 1) }, (_, index) => index + 1);
  const laminated = draft.construction === "LAMINATED";
  const insulated = draft.construction === "INSULATED";
  const laminatedInsulated = draft.construction === "LAMINATED_INSULATED";
  const selectedCatalogIds = [
    ...draft.panes.map((pane) => pane.glassProductId),
    ...draft.panes.flatMap((pane) => pane.surfaces.flatMap((surface) => surface.treatmentIds)),
    ...draft.interlayers.flatMap((layer) => [layer.materialId, layer.colorId]),
    ...draft.cavities.flatMap((cavity) => [cavity.spacerTypeId, cavity.spacerColorId]),
  ];
  const requiredKinds: GlassCatalogKind[] = [
    "GLASS_PRODUCT",
    ...(laminated || laminatedInsulated ? ["INTERLAYER_MATERIAL", "INTERLAYER_COLOR"] as const : []),
    ...(insulated || laminatedInsulated ? ["SPACER_TYPE", "SPACER_COLOR"] as const : []),
  ];
  const hasCatalogKinds = requiredKinds.every((kind) => entriesOf(catalogs, kind).some((entry) =>
    entry.active || selectedCatalogIds.includes(entry.id)));
  const isComplete = !laminatedInsulated || (
    gaps.every((gapNumber) =>
      draft.interlayers.some((layer) => layer.gapNumber === gapNumber)
      !== draft.cavities.some((cavity) => cavity.gapNumber === gapNumber))
    && draft.interlayers.length > 0
    && draft.cavities.length > 0
  );

  function setGapType(gapNumber: number, type: "NONE" | "LAMINATED" | "INSULATED") {
    setDraft((current) => {
      const interlayers = current.interlayers.filter((layer) => layer.gapNumber !== gapNumber);
      const cavities = current.cavities.filter((cavity) => cavity.gapNumber !== gapNumber);
      if (type === "LAMINATED") {
        interlayers.push(defaultInterlayer(catalogs, gapNumber, 1));
      }
      if (type === "INSULATED") {
        cavities.push(defaultCavity(catalogs, gapNumber));
      }
      return { ...current, interlayers, cavities };
    });
  }

  function renderGap(gapNumber: number) {
    const layers = draft.interlayers.map((layer, index) => ({ layer, index })).filter(({ layer }) => layer.gapNumber === gapNumber);
    const cavityIndex = draft.cavities.findIndex((cavity) => cavity.gapNumber === gapNumber);
    const hasInterlayer = layers.length > 0;
    const gapType = hasInterlayer ? "LAMINATED" : cavityIndex >= 0 ? "INSULATED" : "NONE";
    const isMixedConstruction = laminatedInsulated;
    return <section className={`gap-editor ${gapType.toLowerCase()}`} key={`gap-${gapNumber}`}>
      <div className="line-title">Gap {gapNumber} · between panes {gapNumber} and {gapNumber + 1}</div>
      {isMixedConstruction ? (
        <label>Gap type<select value={gapType} onChange={(event) => setGapType(gapNumber, event.target.value as "NONE" | "LAMINATED" | "INSULATED")}>
          <option value="NONE">Choose later</option><option value="LAMINATED">Laminated</option><option value="INSULATED">Insulating cavity</option>
        </select></label>
      ) : <p className="gap-type-label">{gapType === "LAMINATED" ? "Laminated gap" : "Insulating cavity gap"}</p>}
      {gapType === "LAMINATED" && <>
        <div className="section-rule"><span>LAMINATING INTERLAYERS</span><button className="text-button" type="button" onClick={() => setDraft((current) => ({ ...current, interlayers: [...current.interlayers, defaultInterlayer(catalogs, gapNumber, layers.length + 1)] }))}>+ Add sheet</button></div>
        {layers.map(({ layer, index }) => <div className="pane-editor" key={`layer-${layer.sheetNumber}`}>
          <div className="line-title">Interlayer sheet {layer.sheetNumber}{layers.length > 1 && <button className="remove-button" type="button" aria-label={`Remove interlayer sheet ${layer.sheetNumber}`} onClick={() => setDraft((current) => ({ ...current, interlayers: current.interlayers.filter((_, layerIndex) => layerIndex !== index).map((item) => item.gapNumber === gapNumber ? { ...item, sheetNumber: item.sheetNumber > layer.sheetNumber ? item.sheetNumber - 1 : item.sheetNumber } : item) }))}>×</button>}</div>
          <label>Material<CatalogSelect catalogs={catalogs} kind="INTERLAYER_MATERIAL" value={layer.materialId} onChange={(value) => updateInterlayer(index, { materialId: value })} /></label>
          <label>Color<CatalogSelect catalogs={catalogs} kind="INTERLAYER_COLOR" value={layer.colorId} onChange={(value) => updateInterlayer(index, { colorId: value })} /></label>
          <div className="line-fields"><label>Thickness (in)<input required type="number" min="0.0001" step="0.0001" value={layer.thickness} onChange={(event) => updateInterlayer(index, { thickness: Number(event.target.value) })} /></label><label>Brand <span className="optional">optional</span><input value={layer.brand} onChange={(event) => updateInterlayer(index, { brand: event.target.value })} /></label></div>
        </div>)}
      </>}
      {gapType === "INSULATED" && cavityIndex >= 0 && <div className="pane-editor">
        <div className="line-title">Insulating cavity</div>
        <label>Spacer type<CatalogSelect catalogs={catalogs} kind="SPACER_TYPE" value={draft.cavities[cavityIndex].spacerTypeId} onChange={(value) => updateCavity(cavityIndex, { spacerTypeId: value })} /></label>
        <label>Spacer color<CatalogSelect catalogs={catalogs} kind="SPACER_COLOR" value={draft.cavities[cavityIndex].spacerColorId} onChange={(value) => updateCavity(cavityIndex, { spacerColorId: value })} /></label>
        <label>Cavity width (in)<input required type="number" min="0.0001" step="0.0001" value={draft.cavities[cavityIndex].width} onChange={(event) => updateCavity(cavityIndex, { width: Number(event.target.value) })} /><small className="measurement-hint">{formatInches(draft.cavities[cavityIndex].width)}</small></label>
        <label className="checkbox-label"><input type="checkbox" checked={draft.cavities[cavityIndex].gasFilled} onChange={(event) => updateCavity(cavityIndex, { gasFilled: event.target.checked })} /> Gas-filled</label>
      </div>}
    </section>;
  }

  return (
    <form className="glass-unit-editor form-stack" onSubmit={(event) => void submit(event)}>
      {error && <div className="alert error" role="alert">{error}</div>}
      {notice && <div className="alert success" role="status">{notice}</div>}
      {!hasCatalogKinds && <p className="form-hint">Add active entries to each catalog in the Catalogs tab before saving a glass specification.</p>}
      <div className="line-fields">
        <label>Overall width (in)<input required type="number" min="0.0001" step="0.0001" value={draft.overallWidth} onChange={(event) => setDraft({ ...draft, overallWidth: Number(event.target.value) })} /></label>
        <label>Overall height (in)<input required type="number" min="0.0001" step="0.0001" value={draft.overallHeight} onChange={(event) => setDraft({ ...draft, overallHeight: Number(event.target.value) })} /></label>
      </div>
      <label>Construction<select value={draft.construction} onChange={(event) => setDraft((current) => resizeForConstruction(current, event.target.value as GlassUnitInput["construction"], current.panes.length, catalogs))}>
        <option value="MONOLITHIC">Monolithic</option><option value="INSULATED">Insulated</option><option value="LAMINATED">Laminated</option><option value="LAMINATED_INSULATED">Laminated-insulated</option>
      </select></label>
      <label>Specification notes <span className="optional">optional</span><input maxLength={2000} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
      <div className="section-rule"><span>PANES · EXTERIOR TO INTERIOR</span>
        {draft.construction !== "MONOLITHIC" && <button className="text-button" type="button" disabled={draft.panes.length >= 20} onClick={() => setDraft((current) => resizeForConstruction(current, current.construction, current.panes.length + 1, catalogs))}>+ Add pane</button>}
      </div>
      {draft.panes.map((pane, paneIndex) => (
        <Fragment key={paneIndex}>
        <section className="pane-editor">
          <div className="line-title">Pane {paneIndex + 1} {paneIndex === 0 ? "(exterior)" : paneIndex === draft.panes.length - 1 ? "(interior)" : ""}{paneIndex === draft.panes.length - 1 && draft.panes.length > 2 && <button className="remove-button" type="button" aria-label="Remove last pane" onClick={() => setDraft((current) => resizeForConstruction(current, current.construction, current.panes.length - 1, catalogs))}>×</button>}</div>
          <label>Glass product<CatalogSelect catalogs={catalogs} kind="GLASS_PRODUCT" value={pane.glassProductId} onChange={(value) => updatePane(paneIndex, { glassProductId: value })} /></label>
          <div className="line-fields">
            <label>Width (in)<input required type="number" min="0.0001" step="0.0001" value={pane.width} onChange={(event) => updatePane(paneIndex, { width: Number(event.target.value) })} /><small className="measurement-hint">{formatInches(pane.width)}</small></label>
            <label>Height (in)<input required type="number" min="0.0001" step="0.0001" value={pane.height} onChange={(event) => updatePane(paneIndex, { height: Number(event.target.value) })} /><small className="measurement-hint">{formatInches(pane.height)}</small></label>
          </div>
          <div className="line-fields">
            <label>Thickness (in)<input required type="number" min="0.0001" step="0.0001" value={pane.thickness} onChange={(event) => updatePane(paneIndex, { thickness: Number(event.target.value) })} /><small className="measurement-hint">{formatInches(pane.thickness)}</small></label>
            <label>Heat treatment<select value={pane.heatTreatment} onChange={(event) => updatePane(paneIndex, { heatTreatment: event.target.value as GlassUnitInput["panes"][number]["heatTreatment"] })}><option value="NONE">None</option><option value="TEMPERED">Tempered</option><option value="HEAT_STRENGTHENED">Heat strengthened</option></select></label>
          </div>
          <div className="checkbox-row">
            <label><input type="checkbox" checked={pane.hasHoles} onChange={(event) => updatePane(paneIndex, { hasHoles: event.target.checked })} /> Holes</label>
            <label><input type="checkbox" checked={pane.flatPolish} onChange={(event) => updatePane(paneIndex, { flatPolish: event.target.checked })} /> Flat polish</label>
            <label><input type="checkbox" checked={pane.bevel} onChange={(event) => updatePane(paneIndex, { bevel: event.target.checked })} /> Bevel</label>
          </div>
          {pane.surfaces.map((surface) => {
            const surfaceNumber = paneIndex * 2 + (surface.side === "A" ? 1 : 2);
            return <fieldset className="treatment-fieldset" key={surface.side}>
              <legend>Surface {surfaceNumber} · Side {surface.side} · {surface.side === "A" ? "exterior-facing" : "interior-facing"}</legend>
              {entriesOf(catalogs, "SURFACE_TREATMENT").filter((entry) => entry.active || surface.treatmentIds.includes(entry.id)).map((entry) => (
                <label key={entry.id}><input type="checkbox" checked={surface.treatmentIds.includes(entry.id)} onChange={() => toggleTreatment(paneIndex, surface.side, entry.id)} /> {entry.name}{entry.facilityWorkRequired ? " · facility work" : ""}</label>
              ))}
              {entriesOf(catalogs, "SURFACE_TREATMENT").length === 0 && <span className="form-hint">No treatment catalog entries yet.</span>}
            </fieldset>;
          })}
        </section>
        {paneIndex < gaps.length && renderGap(paneIndex + 1)}
        </Fragment>
      ))}
      {laminatedInsulated && !isComplete && <p className="gap-validation-hint" role="status">For a laminated-insulated unit, use at least three panes to create separate gaps. Assign every gap to either laminated or insulating, with at least one of each, before saving.</p>}
      <button className="primary-button" type="submit" disabled={saving || !hasCatalogKinds || !isComplete}>{saving ? "Saving specification…" : unit ? "Update glass specification" : "Save glass specification"}<span>→</span></button>
    </form>
  );
}
