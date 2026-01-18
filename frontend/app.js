const API = "";
const LS_TOKEN = "pt_token";
const LS_USER = "pt_user";

const $ = (q) => document.querySelector(q);

const el = {
  authCard: $("#authCard"),
  appCard: $("#appCard"),
  details: $("#details"),

  me: $("#me"),
  btnLogout: $("#btnLogout"),

  tabs: document.querySelectorAll(".tab"),
  loginForm: $("#loginForm"),
  registerForm: $("#registerForm"),
  loginMsg: $("#loginMsg"),
  registerMsg: $("#registerMsg"),

  plantList: $("#plantList"),
  btnRefresh: $("#btnRefresh"),
  plantForm: $("#plantForm"),
  plantMsg: $("#plantMsg"),

  plantTitle: $("#plantTitle"),
  plantMeta: $("#plantMeta"),

  eventForm: $("#eventForm"),
  eventMsg: $("#eventMsg"),
  eventList: $("#eventList"),

  remForm: $("#remForm"),
  remMsg: $("#remMsg"),
  remList: $("#remList"),

  photoForm: $("#photoForm"),
  photoMsg: $("#photoMsg"),
  photoGrid: $("#photoGrid"),

  stateForm: $("#stateForm"),
  stateMsg: $("#stateMsg"),
  stateList: $("#stateList"),

  stateAtForm: $("#stateAtForm"),
  stateAtMsg: $("#stateAtMsg"),
  stateAtResult: $("#stateAtResult"),

  apiStatus: $("#apiStatus"),
};

let currentPlant = null;

function setMsg(node, text, ok = false) {
  node.textContent = text || "";
  node.style.color = ok ? "#22c55e" : "#ef4444";
}

function fmtDMY(isoLike) {
  if (!isoLike) return "";
  const m = String(isoLike).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(isoLike);
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function toIsoFromLocalDatetime(localStr) {
  const s = (localStr || "").trim();
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toISOString();
}

function formatValjanostRange(rangeText) {
  if (!rangeText) return "-";
  const m = String(rangeText).match(/\[\s*"?(.*?)"?\s*,\s*"?(.*?)"?\s*[\)\]]/);
  if (!m) return String(rangeText);
  return `${fmtDMY(m[1])} - ${fmtDMY(m[2])}`;
}

function token() {
  return localStorage.getItem(LS_TOKEN) || "";
}

function setSession(t, user) {
  localStorage.setItem(LS_TOKEN, t);
  localStorage.setItem(LS_USER, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_USER);
}

function getUser() {
  try { return JSON.parse(localStorage.getItem(LS_USER) || "null"); }
  catch { return null; }
}

async function apiFetch(path, opts = {}) {
  const headers = opts.headers || {};
  if (!(opts.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const t = token();
  if (t) headers["Authorization"] = `Bearer ${t}`;

  const res = await fetch(API + path, { ...opts, headers });
  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    const msg = (data && data.error) ? data.error : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function showAuth() {
  el.authCard.classList.remove("hidden");
  el.appCard.classList.add("hidden");
  el.details.classList.add("hidden");
  el.btnLogout.classList.add("hidden");
  el.me.textContent = "";
}

function showApp() {
  const u = getUser();
  el.me.textContent = u ? u.email : "";
  el.btnLogout.classList.remove("hidden");

  el.authCard.classList.add("hidden");
  el.appCard.classList.remove("hidden");
}

function activateTab(name) {
  el.tabs.forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  if (name === "login") {
    el.loginForm.classList.remove("hidden");
    el.registerForm.classList.add("hidden");
  } else {
    el.registerForm.classList.remove("hidden");
    el.loginForm.classList.add("hidden");
  }
  setMsg(el.loginMsg, "");
  setMsg(el.registerMsg, "");
}

function renderPlants(plants) {
  el.plantList.innerHTML = "";
  plants.forEach((p) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div style="display:flex; gap:10px; align-items:center; justify-content:space-between;">
        <div>
          <b>${p.naziv}</b> <span class="muted">(${p.vrsta})</span><br/>
          <span class="muted">${p.lokacija || ""}</span>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn ghost" data-act="open">Otvori</button>
          <button class="btn ghost" data-act="del">Obriši</button>
        </div>
      </div>
    `;
    li.querySelector('[data-act="open"]').onclick = () => openPlant(p);
    li.querySelector('[data-act="del"]').onclick = () => deletePlant(p.biljka_id);
    el.plantList.appendChild(li);
  });
}

async function loadPlants() {
  const plants = await apiFetch("/plants");
  renderPlants(plants);
}

async function deletePlant(id) {
  if (!confirm("Obrisati biljku?")) return;
  await apiFetch(`/plants/${id}`, { method: "DELETE" });
  if (currentPlant && currentPlant.biljka_id === id) {
    currentPlant = null;
    el.details.classList.add("hidden");
  }
  await loadPlants();
}

function openPlant(p) {
  currentPlant = p;
  el.details.classList.remove("hidden");
  el.plantTitle.textContent = p.naziv;
  el.plantMeta.textContent = `${p.vrsta} • ${p.lokacija || ""}`;
  loadPlantDetails();
}

function renderList(ul, items, mapFn) {
  ul.innerHTML = "";
  items.forEach((it) => {
    const li = document.createElement("li");
    li.innerHTML = mapFn(it);
    ul.appendChild(li);
  });
}

function badgeForReminder(r) {
  if (!r || r.status !== "aktivan") return "";
  const rok = new Date(r.rok);
  const now = new Date();
  if (rok < now) return `<span class="badge late">Kasni</span>`;
  return `<span class="badge due">Ističe</span>`;
}

async function loadPlantDetails() {
  if (!currentPlant) return;

  const id = currentPlant.biljka_id;

  const events = await apiFetch(`/events/${id}`);
  renderList(el.eventList, events, (e) =>
    `<div><b>${e.vrsta_dogadjaja}</b> <span class="muted">${new Date(e.vrijeme_dogadjaja).toLocaleString()}</span><br/>
      <span class="muted">${e.opis || ""}</span></div>`
  );

  let active = [];
  try {
    active = await apiFetch(`/reminders/active?biljka_id=${id}`);
  } catch (_) {
    active = [];
  }

  const all = await apiFetch(`/reminders`);
  const allForPlant = all.filter((r) => String(r.biljka_id) === String(id));

  renderList(el.remList, allForPlant, (r) => {
    const actObj = active.find((a) => String(a.podsjetnik_id) === String(r.podsjetnik_id));
    const badge = actObj ? badgeForReminder(r) : `<span class="badge done">Arhiva</span>`;
    const extra = actObj ? (actObj.kasni ? `<span class="muted">Kasni</span>` : `<span class="muted">${actObj.dana_do_roka} dana</span>`) : "";
    return `<div>
      <b>${r.vrsta_podsjetnika}</b>${badge}
      <span class="muted">${new Date(r.rok).toLocaleString()} ${extra}</span><br/>
      <span class="muted">status: ${r.status} • izvor: ${r.izvor || ""}</span>
    </div>`;
  });

  const photos = await apiFetch(`/photos/${id}`);
  el.photoGrid.innerHTML = "";
  photos.forEach((ph) => {
    const src = "/" + String(ph.putanja_datoteke || "").replace(/^\/+/, "");
    const box = document.createElement("div");
    box.className = "photo";
    box.innerHTML = `<img src="${src}" alt="photo"/><div class="muted">${ph.opis || ""}</div>`;
    el.photoGrid.appendChild(box);
  });

  const states = await apiFetch(`/state/${id}`);
  renderList(el.stateList, states, (s) =>
    `<div><b>valjanost:</b> <span class="muted">${formatValjanostRange(s.valjanost)}</span><br/>
      <span class="muted">visina: ${s.visina_cm ?? ""} • listovi: ${s.broj_listova ?? ""} • zdravlje: ${s.ocjena_zdravlja ?? ""}</span><br/>
      <span class="muted">${s.napomena || ""}</span></div>`
  );
}

async function initHealth() {
  try {
    await apiFetch("/health");
    el.apiStatus.textContent = "OK";
  } catch {
    el.apiStatus.textContent = "FAIL";
  }
}

el.tabs.forEach((b) => (b.onclick = () => activateTab(b.dataset.tab)));

el.loginForm.onsubmit = async (e) => {
  e.preventDefault();
  try {
    const fd = new FormData(el.loginForm);
    const payload = { email: fd.get("email"), password: fd.get("password") };
    const res = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify(payload) });
    setSession(res.token, res.user);
    setMsg(el.loginMsg, "Prijava OK", true);
    showApp();
    await loadPlants();
  } catch (err) {
    setMsg(el.loginMsg, err.message || "Greška");
  }
};

el.registerForm.onsubmit = async (e) => {
  e.preventDefault();
  try {
    const fd = new FormData(el.registerForm);
    const payload = { email: fd.get("email"), password: fd.get("password") };
    const res = await apiFetch("/auth/register", { method: "POST", body: JSON.stringify(payload) });
    setSession(res.token, res.user);
    setMsg(el.registerMsg, "Registracija OK", true);
    showApp();
    await loadPlants();
  } catch (err) {
    setMsg(el.registerMsg, err.message || "Greška");
  }
};

el.btnLogout.onclick = () => {
  clearSession();
  showAuth();
};

el.btnRefresh.onclick = async () => {
  try {
    await loadPlants();
    if (currentPlant) await loadPlantDetails();
  } catch (e) {
  }
};

el.plantForm.onsubmit = async (e) => {
  e.preventDefault();
  try {
    const fd = new FormData(el.plantForm);
    const payload = {
      naziv: fd.get("naziv"),
      vrsta: fd.get("vrsta"),
      datum_nabave: fd.get("datum_nabave") || null,
      lokacija: fd.get("lokacija") || null,
    };
    await apiFetch("/plants", { method: "POST", body: JSON.stringify(payload) });
    el.plantForm.reset();
    setMsg(el.plantMsg, "Biljka spremljena", true);
    await loadPlants();
  } catch (err) {
    setMsg(el.plantMsg, err.message || "Greška");
  }
};

el.eventForm.onsubmit = async (e) => {
  e.preventDefault();
  if (!currentPlant) return;
  try {
    const fd = new FormData(el.eventForm);
    const payload = {
    vrsta_dogadjaja: fd.get("vrsta_dogadjaja"),
    vrijeme_dogadjaja: toIsoFromLocalDatetime(fd.get("vrijeme_dogadjaja")),
    opis: fd.get("opis") || null,
    };
    await apiFetch(`/events/${currentPlant.biljka_id}`, { method: "POST", body: JSON.stringify(payload) });
    el.eventForm.reset();
    setMsg(el.eventMsg, "Događaj dodan", true);
    await loadPlantDetails();
  } catch (err) {
    setMsg(el.eventMsg, err.message || "Greška");
  }
};

el.remForm.onsubmit = async (e) => {
  e.preventDefault();
  if (!currentPlant) return;
  try {
    const fd = new FormData(el.remForm);
    const payload = {
    biljka_id: currentPlant.biljka_id,
    vrsta_podsjetnika: fd.get("vrsta_podsjetnika"),
    rok: toIsoFromLocalDatetime(fd.get("rok")),
    status: fd.get("status"),
    };
    await apiFetch(`/reminders`, { method: "POST", body: JSON.stringify(payload) });
    el.remForm.reset();
    setMsg(el.remMsg, "Podsjetnik dodan", true);
    await loadPlantDetails();
  } catch (err) {
    setMsg(el.remMsg, err.message || "Greška");
  }
};

el.photoForm.onsubmit = async (e) => {
  e.preventDefault();
  if (!currentPlant) return;
  try {
    const fd = new FormData(el.photoForm);
    await apiFetch(`/photos/${currentPlant.biljka_id}`, { method: "POST", body: fd });
    el.photoForm.reset();
    setMsg(el.photoMsg, "Slika uploadana", true);
    await loadPlantDetails();
  } catch (err) {
    setMsg(el.photoMsg, err.message || "Greška");
  }
};

el.stateForm.onsubmit = async (e) => {
  e.preventDefault();
  if (!currentPlant) return;
  try {
    const fd = new FormData(el.stateForm);

    const payload = {
      od: fd.get("od"),
      do: fd.get("doo"),
      visina_cm: fd.get("visina_cm") ? Number(fd.get("visina_cm")) : null,
      broj_listova: fd.get("broj_listova") ? Number(fd.get("broj_listova")) : null,
      ocjena_zdravlja: fd.get("ocjena_zdravlja") ? Number(fd.get("ocjena_zdravlja")) : null,
      napomena: fd.get("napomena") || null,
    };

    await apiFetch(`/state/${currentPlant.biljka_id}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    el.stateForm.reset();
    setMsg(el.stateMsg, "Stanje spremljeno", true);
    await loadPlantDetails();
  } catch (err) {
    setMsg(el.stateMsg, err.message || "Greška");
  }
};

if (el.stateAtForm) {
  el.stateAtForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentPlant) { setMsg(el.stateAtMsg, "Odaberi biljku"); return; }
    const fd = new FormData(el.stateAtForm);
    const date = fd.get("date");
    try {
      const res = await apiFetch(`/state/${currentPlant.biljka_id}/at?date=${encodeURIComponent(date)}`);
      el.stateAtResult.innerHTML = "";
      if (!res) {
        el.stateAtResult.textContent = "Nema spremljenog stanja na taj datum";
      } else {
        el.stateAtResult.innerHTML = `<div><b>valjanost:</b> <span class="muted">${formatValjanostRange(res.valjanost)}</span><br/>
          <span class="muted">visina: ${res.visina_cm ?? ""} • listovi: ${res.broj_listova ?? ""} • zdravlje: ${res.ocjena_zdravlja ?? ""}</span><br/>
          <span class="muted">${res.napomena || ""}</span></div>`;
      }
      setMsg(el.stateAtMsg, "OK", true);
    } catch (err) {
      setMsg(el.stateAtMsg, err.message || "Greška");
    }
  });
}

(async function boot() {
  await initHealth();

  if (token() && getUser()) {
    showApp();
    await loadPlants();
  } else {
    showAuth();
  }
  activateTab("login");
})();