import { DEMO_MODE, createDemoCloud } from './demo-mode.js';
export function initCloud(bridge) {
  if (DEMO_MODE) return createDemoCloud(bridge);
  let online = false,
    role = "owner",
    canCreate = true,
    projects = [],
    status = "Connexion…",
    error = "",
    timer,
    saving = false,
    dirty = false,
    counter = 0,
    conflict = false,
    user = null;
  const state = () => ({
    online,
    role,
    canCreate,
    projects,
    status,
    error,
    conflict,
    user,
    saving,
  });
  const notify = () => bridge.onStatus?.(state());
  async function api(path, options = {}) {
    const headers = {
      ...(options.body && typeof options.body === "string"
        ? { "content-type": "application/json" }
        : {}),
      ...(options.headers || {}),
    };
    const response = await fetch("/api/" + path, {
      ...options,
      headers,
      credentials: "same-origin",
    });
    if (!response.ok) {
      let data;
      try {
        data = await response.json();
      } catch {}
      const e = new Error(
        data?.error || "Enregistrement en ligne indisponible.",
      );
      e.status = response.status;
      throw e;
    }
    return response.headers.get("content-type")?.includes("application/json")
      ? response.json()
      : response.blob();
  }
  async function list() {
    const result = await api("projects");
    projects = result.projects;
    notify();
  }
  async function load(pid, ask = true) {
    if (
      ask &&
      dirty &&
      !(await bridge.confirm(
        "Charger un autre projet ?",
        "Télécharge une sauvegarde si tu souhaites conserver le brouillon actuel.",
      ))
    )
      return;
    clearTimeout(timer);
    if (savePromise) await savePromise;
    clearTimeout(timer);
    const result = await api("projects/" + pid);
    role = result.role;
    dirty = false;
    conflict = false;
    bridge.replace({ ...result.project, draftDirty: false });
    status =
      role === "conducteur"
        ? "Consultation en ligne"
        : "Projet enregistré en ligne";
    await list();
    notify();
  }
  async function connect() {
    try {
      const runtime=await fetch('/runtime-config.json').then(r=>r.ok?r.json():{}).catch(()=>({}));if(runtime.mode==='vercel'){online=false;status='Mode autonome · projets sur cet appareil';error='La connexion IA se fait dans l’en-tête ; la synchronisation Sites n’est pas active sur Vercel.';notify();return;}

      const session = await api("session");
      online = true;
      user = session.user;
      canCreate = session.canCreate ?? session.owner;
      await list();
      const p = bridge.get();
      if (p.cloudId) {
        const result = await api("projects/" + p.cloudId);
        role = result.role;
        if (p.draftDirty && result.version !== p.cloudVersion) {
          conflict = true;
          dirty = true;
          status = "Conflit de versions";
        } else if (!p.draftDirty) {
          bridge.replace({ ...result.project, draftDirty: false });
          status = "Projet chargé en ligne";
        } else {
          dirty = true;
          await settle();
        }
      } else if (!p.rows.length && projects.length)
        await load(projects[0].id, false);
      else if (canCreate) {
        dirty = true;
        await settle();
      } else if (projects.length) await load(projects[0].id, false);
      status = conflict
        ? "Conflit de versions"
        : role === "conducteur"
          ? "Consultation en ligne"
          : "Projet enregistré en ligne";
      bridge.syncPlan?.();
    } catch (e) {
      online = false;
      status = "Mode local · sauvegarde JSON";
      error =
        e.status === 401
          ? "Connecte-toi au site pour synchroniser les projets."
          : e.message;
    }
    notify();
  }
  let savePromise = null;
  async function flush() {
    if (savePromise) return savePromise;
    savePromise = runFlush().finally(() => {
      savePromise = null;
    });
    return savePromise;
  }
  async function runFlush() {
    clearTimeout(timer);
    if (!online || saving || !dirty || conflict || role === "conducteur")
      return;
    const p = { ...bridge.get(), revisions: [] },
      token = counter;
    delete p.revisions;
    if (!p.cloudId && !canCreate) return;
    saving = true;
    status = "Enregistrement en cours…";
    notify();
    try {
      const result = await api(
        p.cloudId ? "projects/" + p.cloudId : "projects",
        {
          method: p.cloudId ? "PUT" : "POST",
          headers: p.cloudId ? { "if-match": String(p.cloudVersion) } : {},
          body: bridge.encode ? await bridge.encode(p) : JSON.stringify(p),
        },
      );
      role = result.role;
      bridge.syncFields({
        cloudId: result.project.cloudId,
        cloudVersion: result.version,
        approval: result.project.approval,
        draftDirty: counter !== token,
      });
      dirty = counter !== token;
      status = "Projet enregistré en ligne";
      error = "";
      const entry = projects.find((x) => x.id === result.project.cloudId);
      if (entry) {
        const renamed = entry.title !== result.project.title;
        entry.title = result.project.title;
        entry.version = result.version;
        if (renamed) projects = projects.slice();
      } else
        projects = [
          {
            id: result.project.cloudId,
            title: result.project.title,
            role: result.role,
            version: result.version,
          },
          ...projects,
        ];
      bridge.syncPlan?.();
    } catch (e) {
      error = e.message;
      if (e.status === 409) {
        conflict = true;
        status = "Conflit · brouillon conservé";
      } else status = "Échec de synchronisation · brouillon local";
    } finally {
      saving = false;
      notify();
      if (dirty && !conflict && !error) timer = setTimeout(flush, 600);
    }
  }
  async function settle() {
    await flush();
    while (online && dirty && !conflict && !error) await flush();
    if (online && (conflict || error))
      throw new Error(
        error || "Conflit de versions : recharge le projet avant de continuer.",
      );
  }
  function changed() {
    if (role === "conducteur" && online) return;
    dirty = true;
    counter++;
    bridge.get().draftDirty = true;
    if (online && !conflict) {
      clearTimeout(timer);
      timer = setTimeout(flush, 800);
    } else if (!online) status = "Brouillon enregistré dans ce navigateur";
    notify();
  }
  async function create() {
    if (online && !canCreate)
      throw new Error("Ton rôle ne permet pas de créer un projet.");
    await settle();
    bridge.replace(bridge.empty());
    role = "owner";
    dirty = true;
    counter++;
    if (online) await settle();
    notify();
  }
  async function revisions() {
    if (online && bridge.get().cloudId)
      return (await api("projects/" + bridge.get().cloudId + "/revisions"))
        .revisions;
    return bridge.get().revisions || [];
  }
  async function saveRevision(label) {
    await settle();
    if (online && bridge.get().cloudId) {
      await api("projects/" + bridge.get().cloudId + "/revisions", {
        method: "POST",
        body: JSON.stringify({ label }),
      });
    } else bridge.localRevision(label);
    return revisions();
  }
  async function restoreRevision(rid) {
    if (
      !(await bridge.confirm(
        "Restaurer cette révision ?",
        "Une révision de sécurité du projet courant sera conservée avant la restauration.",
      ))
    )
      return;
    if (online && bridge.get().cloudId) {
      await settle();
      await saveRevision(
        "Avant restauration · " + new Date().toLocaleString("fr-FR"),
      );
      const p = bridge.get(),
        result = await api(
          "projects/" + p.cloudId + "/revisions/" + rid + "/restore",
          { method: "POST", headers: { "if-match": String(p.cloudVersion) } },
        );
      bridge.replace({ ...result.project, draftDirty: false });
      dirty = false;
      status = "Révision restaurée en ligne";
    } else bridge.restoreLocal(rid);
    notify();
  }
  async function approve() {
    await settle();
    if (!online)
      throw new Error(
        "La validation du dirigeant nécessite l’enregistrement en ligne.",
      );
    const p = bridge.get(),
      result = await api("projects/" + p.cloudId + "/approve", {
        method: "POST",
        headers: { "if-match": String(p.cloudVersion) },
      });
    bridge.replace({ ...result.project, draftDirty: false });
    status = "Chiffrage validé par le dirigeant";
    notify();
  }
  async function saveAsset(file) {
    if (!online || role === "conducteur") return null;
    const sourceAsset = bridge.get().planWorkspace?.assetId;
    await settle();
    if (sourceAsset !== bridge.get().planWorkspace?.assetId) return null;
    const pid = bridge.get().cloudId;
    if (!pid) return null;
    const form = new FormData();
    form.append("file", file, file.name || "Plan");
    const result = await api("projects/" + pid + "/assets", {
      method: "POST",
      body: form,
    });
    return result.id;
  }
  async function loadAsset(aid) {
    const pid = bridge.get().cloudId;
    if (!online || !pid)
      throw new Error("Plan en ligne indisponible sur cet appareil.");
    return api("projects/" + pid + "/assets/" + aid);
  }
  const members = async () =>
    online && bridge.get().cloudId
      ? (await api("projects/" + bridge.get().cloudId + "/members")).members
      : [];
  const saveMember = async (email, newRole) => {
    if (!online || !bridge.get().cloudId)
      throw new Error(
        "Enregistre le projet en ligne avant de définir les rôles.",
      );
    await api("projects/" + bridge.get().cloudId + "/members", {
      method: "POST",
      body: JSON.stringify({ email, role: newRole }),
    });
    return members();
  };
  const removeMember = async (mid) => {
    await api("projects/" + bridge.get().cloudId + "/members/" + mid, {
      method: "DELETE",
    });
    return members();
  };
  const ready = connect();
  return {
    ready,
    state,
    connect,
    changed,
    flush,
    load,
    create,
    revisions,
    saveRevision,
    restoreRevision,
    approve,
    saveAsset,
    loadAsset,
    members,
    saveMember,
    removeMember,
  };
}
