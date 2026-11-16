const omit = (value, keys) =>
  Object.fromEntries(
    Object.entries(value || {}).filter(([key]) => !keys.includes(key)),
  );

/** Données normalisées : les plans restent des Blob, les lignes des objets IDB.
 * Une saisie d'épaisseur ne renvoie au worker qu'une ligne, jamais le PDF ni
 * le JSON de toutes les révisions. Le schéma JSON d'export reste inchangé. */
export function storagePatch(previous, project, reset = false) {
  reset ||= !previous;
  const oldRows = new Map(
    (reset ? [] : previous.rows).map((row) => [row.id, row]),
  );
  const rows = project.rows.filter((row) => oldRows.get(row.id) !== row);
  const order = project.rows.map((row) => row.id),
    present = new Set(order);
  const pages = project.planWorkspace?.pages || {},
    oldPages = reset ? {} : previous.planWorkspace?.pages || {};
  const traceWrites = [],
    traceRemovals = [];
  for (const [pageKey, page] of Object.entries(pages)) {
    const old = new Map(
      (oldPages[pageKey]?.traces || []).map((t) => [t.id, t]),
    );
    for (const trace of page.traces || [])
      if (old.get(trace.id) !== trace)
        traceWrites.push([[pageKey, trace.id], trace]);
    const ids = new Set((page.traces || []).map((t) => t.id));
    for (const id of old.keys())
      if (!ids.has(id)) traceRemovals.push([pageKey, id]);
  }
  for (const key of Object.keys(oldPages))
    if (!(key in pages))
      for (const trace of oldPages[key].traces || [])
        traceRemovals.push([key, trace.id]);
  const oldRevisions = new Map(
    (reset ? [] : previous.revisions || []).map((r) => [r.id, r]),
  );
  const revisions = (project.revisions || []).filter(
    (r) => oldRevisions.get(r.id) !== r,
  );
  // Les clauses sont normalisées comme les lignes : une frappe n'envoie
  // qu'un article au Worker, pas les centaines de descriptions du CCTP.
  const oldArticles = new Map(
    (reset ? [] : previous.cctp?.articles || []).map((a) => [a.id, a]),
  );
  const articles = project.cctp?.articles || [],
    articleIds = new Set(articles.map((a) => a.id));
  return {
    reset,
    cctpWrites: articles.filter((a) => oldArticles.get(a.id) !== a),
    cctpRemovals: [...oldArticles.keys()].filter((id) => !articleIds.has(id)),
    rows,
    removeRows: [...oldRows.keys()].filter((id) => !present.has(id)),
    traceWrites,
    traceRemovals,
    pages: Object.entries(pages)
      .filter(([key, page]) => oldPages[key] !== page)
      .map(([key, page]) => [
        key,
        {
          ...omit(page, ["traces"]),
          traceOrder: (page.traces || []).map((t) => t.id),
        },
      ]),
    removePages: Object.keys(oldPages).filter((page) => !(page in pages)),
    revisions,
    removeRevisions: [...oldRevisions.keys()].filter(
      (id) => !(project.revisions || []).some((r) => r.id === id),
    ),
    head: {
      data: omit(project, ["rows", "planWorkspace", "revisions", "cctp"]),
      cctp: project.cctp
        ? {
            ...omit(project.cctp, ["articles"]),
            articleOrder: articles.map((a) => a.id),
          }
        : null,
      rowOrder: order,
      plan: project.planWorkspace
        ? omit(project.planWorkspace, ["pages"])
        : null,
      revisionOrder: (project.revisions || []).map((r) => r.id),
    },
  };
}

export function createRepository(indexedDB, name = "atelier-metre-v2") {
  let opening;
  function open() {
    if (!opening)
      opening = new Promise((resolve, reject) => {
        const request = indexedDB.open(name, 2);
        request.onupgradeneeded = () => {
          for (const store of [
            "head",
            "rows",
            "pages",
            "revisions",
            "assets",
            "traces",
            "cctpArticles",
          ])
            if (!request.result.objectStoreNames.contains(store))
              request.result.createObjectStore(store);
        };
        request.onsuccess = () => {
          const db = request.result;
          db.onversionchange = () => {
            db.close();
            opening = null;
          };
          resolve(db);
        };
        request.onerror = () => {
          opening = null;
          reject(request.error);
        };
        request.onblocked = () =>
          reject(
            new Error(
              "Ferme les autres onglets pour mettre à jour la sauvegarde.",
            ),
          );
      });
    return opening;
  }
  async function transaction(stores, mode, work) {
    const db = await open();
    return new Promise((resolve, reject) => {
      let tx;
      try {
        tx = db.transaction(
          stores,
          mode,
          mode === "readwrite" ? { durability: "strict" } : undefined,
        );
      } catch {
        tx = db.transaction(stores, mode);
      }
      let result;
      tx.oncomplete = () =>
        resolve(typeof result === "function" ? result() : result);
      tx.onabort = tx.onerror = () =>
        reject(tx.error || new Error("Écriture IndexedDB interrompue."));
      try {
        result = work(tx);
      } catch (error) {
        tx.abort();
        reject(error);
      }
    });
  }
  return {
    async write(patch) {
      // Le succès des requêtes put n'est pas une preuve de sauvegarde : attendre
      // le commit de la transaction multi-stores pour publier « Enregistré ».
      return transaction(
        ["head", "rows", "pages", "revisions", "traces", "cctpArticles"],
        "readwrite",
        (tx) => {
          if (patch.reset)
            for (const name of [
              "rows",
              "pages",
              "revisions",
              "traces",
              "cctpArticles",
            ])
              tx.objectStore(name).clear();
          tx.objectStore("head").put(patch.head, "current");
          for (const a of patch.cctpWrites || [])
            tx.objectStore("cctpArticles").put(a, a.id);
          for (const id of patch.cctpRemovals || [])
            tx.objectStore("cctpArticles").delete(id);
          for (const row of patch.rows) tx.objectStore("rows").put(row, row.id);
          for (const id of patch.removeRows) tx.objectStore("rows").delete(id);
          for (const [key, trace] of patch.traceWrites || [])
            tx.objectStore("traces").put(trace, key);
          for (const key of patch.traceRemovals || [])
            tx.objectStore("traces").delete(key);
          for (const [page, value] of patch.pages)
            tx.objectStore("pages").put(value, page);
          for (const page of patch.removePages)
            tx.objectStore("pages").delete(page);
          for (const revision of patch.revisions)
            tx.objectStore("revisions").put(revision, revision.id);
          for (const id of patch.removeRevisions)
            tx.objectStore("revisions").delete(id);
        },
      );
    },
    async load() {
      return transaction(
        ["head", "rows", "pages", "revisions", "traces", "cctpArticles"],
        "readonly",
        (tx) => {
          const traceKeys = tx.objectStore("traces").getAllKeys(),
            traceValues = tx.objectStore("traces").getAll();
          const cctpArticles = tx.objectStore("cctpArticles").getAll();
          const head = tx.objectStore("head").get("current"),
            rows = tx.objectStore("rows").getAll(),
            pageKeys = tx.objectStore("pages").getAllKeys(),
            pages = tx.objectStore("pages").getAll(),
            revisions = tx.objectStore("revisions").getAll();
          return () => {
            const traces = new Map(
              traceKeys.result.map((key, i) => [
                JSON.stringify(key),
                traceValues.result[i],
              ]),
            );
            if (!head.result) return null;
            const h = head.result,
              clauses = new Map(cctpArticles.result.map((a) => [a.id, a])),
              byId = new Map(rows.result.map((r) => [r.id, r])),
              revs = new Map(revisions.result.map((r) => [r.id, r]));
            return {
              ...h.data,
              ...(h.cctp
                ? {
                    cctp: {
                      ...omit(h.cctp, ["articleOrder"]),
                      articles: h.cctp.articleOrder
                        .map((id) => clauses.get(id))
                        .filter(Boolean),
                    },
                  }
                : {}),
              rows: h.rowOrder.map((id) => byId.get(id)),
              planWorkspace: h.plan
                ? {
                    ...h.plan,
                    pages: Object.fromEntries(
                      pageKeys.result.map((key, i) => [
                        key,
                        {
                          ...omit(pages.result[i], ["traceOrder"]),
                          traces: (pages.result[i].traceOrder || [])
                            .map((id) =>
                              traces.get(JSON.stringify([String(key), id])),
                            )
                            .filter(Boolean),
                        },
                      ]),
                    ),
                  }
                : null,
              revisions: h.revisionOrder
                .map((id) => revs.get(id))
                .filter(Boolean),
            };
          };
        },
      );
    },
    async putAsset(key, blob) {
      return transaction(["assets"], "readwrite", (tx) => {
        tx.objectStore("assets").put(blob, key);
      });
    },
    async getAsset(key) {
      return transaction(["assets"], "readonly", (tx) => {
        const r = tx.objectStore("assets").get(key);
        return () => r.result;
      });
    },
    async close() {
      (await open()).close();
      opening = null;
    },
  };
}
