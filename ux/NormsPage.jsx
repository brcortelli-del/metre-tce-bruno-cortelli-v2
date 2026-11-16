import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  BookOpen,
  ExternalLink,
  AlertTriangle,
  FileJson,
  ShieldCheck,
} from "lucide-react";
export function NormsPage({ bridge }) {
  const [data, setData] = useState(null),
    [audit, setAudit] = useState(null),
    [query, setQuery] = useState(""),
    [family, setFamily] = useState(""),
    [active, setActive] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    Promise.all(
      [
        "/data/referentiel_normes_france.json",
        "/data/audit_et_sources.json",
      ].map((u) =>
        fetch(u).then((r) => {
          if (!r.ok) throw new Error("Référentiel indisponible");
          return r.json();
        }),
      ),
    )
      .then(([d, a]) => {
        if (live) {
          setData(d.referentiel_normes_france);
          setAudit(a);
          setActive(d.referentiel_normes_france[0]?.code_norme);
        }
      })
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, []);
  const families = [
    ...new Set((data || []).map((n) => n.lot_associe.split(" / ")[0])),
  ];
  const filtered = useMemo(
    () =>
      (data || []).filter(
        (n) =>
          (!family || n.lot_associe.startsWith(family)) &&
          [
            n.code_norme,
            n.titre_officiel,
            n.lot_associe,
            n.remplace_ancienne_ref,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [data, family, query],
  );
  const item = (data || []).find((n) => n.code_norme === active),
    proof = audit?.references?.[active];
  return (
    <div className="norms-page">
      <div className="ux-page-heading">
        <div>
          <span className="ux-overline">
            RÉFÉRENTIEL FRANCE · VÉRIFIÉ LE 13 NOVEMBRE 2026
          </span>
          <h1>
            Normes & DTU<span className="heading-dot">.</span>
          </h1>
          <p>
            Retrouve les références, leurs conditions d’application et les
            sources de vérification.
          </p>
        </div>
        <a
          className="ux-button"
          href="/data/referentiel_normes_france.json"
          download
        >
          <FileJson size={16} />
          Télécharger le JSON
        </a>
      </div>
      {bridge.get().country === "luxembourg" && (
        <div className="ux-notice">
          <AlertTriangle size={18} />
          Ce registre concerne la France. Les règles Luxembourg restent dans les
          profils FR/LU et les fiches CCTP ; ce registre ne les remplace pas.
        </div>
      )}
      <div className="norms-tools">
        <label className="ux-search">
          <Search size={18} />
          <input
            type="search"
            placeholder="NF DTU, Eurocode, électricité…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Famille de lots"
          value={family}
          onChange={(e) => setFamily(e.target.value)}
        >
          <option value="">Toutes les familles</option>
          {families.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <span>{filtered.length} références</span>
      </div>
      {error && (
        <p role="alert" className="ux-error">
          {error}
        </p>
      )}
      <div className="norms-layout">
        <aside className="ux-card norms-list">
          {filtered.map((n) => (
            <button
              key={n.code_norme}
              className={active === n.code_norme ? "selected" : ""}
              onClick={() => setActive(n.code_norme)}
            >
              <BookOpen size={17} />
              <span>
                <b>{n.code_norme}</b>
                <small>{n.titre_officiel}</small>
              </span>
              <i
                className={
                  audit?.references?.[n.code_norme]?.proposition_cctp_autorisee
                    ? "norm-ready"
                    : "norm-check"
                }
              />
            </button>
          ))}
          {data && !filtered.length && (
            <p>Aucune référence pour cette recherche.</p>
          )}
        </aside>
        <article className="ux-card norm-detail">
          {item ? (
            <>
              <span className="ux-chip">{item.lot_associe}</span>
              <h2>{item.code_norme}</h2>
              <h3>{item.titre_officiel}</h3>
              <p className="norm-status">
                <ShieldCheck size={18} />
                {item.statut}
              </p>
              <dl>
                <dt>Ancienne référence / correction</dt>
                <dd>
                  {item.remplace_ancienne_ref ||
                    "Aucune substitution automatique."}
                </dd>
                <dt>Impact sur le métré et les calculs</dt>
                <dd>{item.impact_metre_et_calcul}</dd>
                <dt>Conditions d’application</dt>
                <dd>
                  {proof?.conditions_application ||
                    "Vérifier le domaine et les pièces du marché."}
                </dd>
              </dl>
              {proof?.parties_nf_dtu?.length > 0 && (
                <div className="norm-parts">
                  <h4>Parties du NF DTU</h4>
                  {proof.parties_nf_dtu.map((p, i) => (
                    <div key={i}>
                      <b>
                        {p.role} · {p.code}
                      </b>
                      <span>
                        {p.millesime} · {p.titre}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div
                className={
                  "norm-clause " +
                  (!proof?.proposition_cctp_autorisee ? "blocked" : "")
                }
              >
                <h4>
                  {proof?.proposition_cctp_autorisee
                    ? "Trame CCTP à adapter"
                    : "Référence à contrôler avant insertion"}
                </h4>
                <p>
                  {item.mention_type_cctp ||
                    "Aucune clause proposée pour cette référence."}
                </p>
                <small>
                  Le changement d’une norme ne crée pas automatiquement une
                  nouvelle règle de déduction des baies.
                </small>
              </div>
              <h4>Sources du contrôle</h4>
              <div className="norm-links">
                {(proof?.sources || [])
                  .filter((s) => /^https:\/\//.test(s.url))
                  .map((s, i) => (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink size={14} />
                      {new URL(s.url).hostname} · source {i + 1}
                    </a>
                  ))}
              </div>
            </>
          ) : (
            <p>Chargement des références…</p>
          )}
        </article>
      </div>
    </div>
  );
}
