document.addEventListener("DOMContentLoaded", async () => {
  const pflanzen = await ladePflanzenVomServer();
  zeigeAllePflanzen(pflanzen);


  document.getElementById("pflanzen-form").addEventListener("submit", async function (e) {
    e.preventDefault();

    const neuePflanze = sammleFormularDaten();
    if (!neuePflanze) return;

    await fetch("/pflanzen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(neuePflanze),
    });

    const daten = await ladePflanzenVomServer();
    zeigeAllePflanzen(daten);
    this.reset();
  });

  const sortAuswahl = document.createElement("select");
  sortAuswahl.innerHTML = `
    <option value="">Sortieren nach...</option>
    <option value="spitzname">Spitzname A-Z</option>
    <option value="datum">Gießdatum</option>
  `;
  sortAuswahl.style.marginBottom = "1em";

  sortAuswahl.addEventListener("change", async () => {
    let daten = await ladePflanzenVomServer();
    if (sortAuswahl.value === "spitzname") {
      daten.sort((a, b) => a.spitzname.localeCompare(b.spitzname));
    } else if (sortAuswahl.value === "datum") {
      daten.sort((a, b) => new Date(a.datum) - new Date(b.datum));
    }
    zeigeAllePflanzen(daten);
  });

  document.querySelector(".pflanzen-liste").prepend(sortAuswahl);
});

function sammleFormularDaten() {
  const emoji = document.getElementById("pflanzen-emoji").value;
  const spitzname = document.getElementById("spitzname").value.trim();
  const pflanzenart = document.getElementById("pflanzenart").value.trim();
  const licht = document.getElementById("licht").value;
  const wasserMenge = document.getElementById("wasser-menge").value;
  const wasserEinheit = document.getElementById("waesserungs-einheit").value;
  const datum = document.getElementById("start-datum").value;
  const beschreibung = document.getElementById("beschreibung").value.trim();

  if (!spitzname || !pflanzenart || !licht || !wasserMenge || !datum) {
    alert("Bitte alle Pflichtfelder ausfüllen.");
    return null;
  }

  let wasserText = `${wasserMenge} ${wasserEinheit}`;
  if (wasserEinheit.includes("Tag")) wasserText = `${wasserMenge} Tag`;
  else if (wasserEinheit.includes("Woche")) wasserText = `${wasserMenge} Woche`;
  else if (wasserEinheit.includes("Monat")) wasserText = `${wasserMenge} Monat`;

  return {
    emoji,
    spitzname,
    pflanzenart,
    licht,
    wasser: wasserText,
    datum,
    beschreibung,
  };
}

function zeigeAllePflanzen(daten) {
  const container = document.getElementById("pflanzen-anzeige");
  container.innerHTML = "";
  daten.forEach(p => zeigePflanze(p));
}

function zeigePflanze(pflanze) {
  const container = document.getElementById("pflanzen-anzeige");

  const karte = document.createElement("div");
  karte.className = "pflanzenkarte";
  karte.dataset.id = pflanze.id;

  const kopf = document.createElement("div");
  kopf.className = "pflanzenkopf";
  kopf.style.cursor = "pointer";
  kopf.style.display = "flex";
  kopf.style.justifyContent = "space-between";
  kopf.style.alignItems = "center";

  const pfeil = document.createElement("span");
  pfeil.textContent = "...";

  const kopfText = document.createElement("span");
  kopfText.textContent = `${pflanze.emoji} ${pflanze.spitzname} (${pflanze.pflanzenart})`;

  kopf.appendChild(kopfText);
  kopf.appendChild(pfeil);

  const details = document.createElement("div");
  details.className = "pflanzendetails";
  details.style.display = "none";
  details.innerHTML = `
    💧 Wässerung: ${pflanze.wasser}<br />
    ☀️ Licht: ${pflanze.licht}<br />
    📅 Ab: ${pflanze.datum}<br />
    📝 ${pflanze.beschreibung}
  `;

  const naechstesGiessen = berechneNaechstesGiessen(pflanze);
  const giessInfo = document.createElement("div");
  giessInfo.textContent = `📅 Nächstes Gießen: ${naechstesGiessen}`;

  const bearbeiteKnopf = document.createElement("button");
  bearbeiteKnopf.textContent = "Bearbeiten";
  bearbeiteKnopf.style.marginRight = "0.5em";
  bearbeiteKnopf.addEventListener("click", async () => {
    document.getElementById("pflanzen-emoji").value = pflanze.emoji;
    document.getElementById("spitzname").value = pflanze.spitzname;
    document.getElementById("pflanzenart").value = pflanze.pflanzenart;
    document.getElementById("licht").value = pflanze.licht;

    const teile = pflanze.wasser.split(" ");
    document.getElementById("wasser-menge").value = teile[0];
    document.getElementById("waesserungs-einheit").value = teile[1];
    document.getElementById("start-datum").value = pflanze.datum;
    document.getElementById("beschreibung").value = pflanze.beschreibung;

    await fetch(`/pflanzen/${pflanze.id}`, { method: "DELETE" });
    const daten = await ladePflanzenVomServer();
    zeigeAllePflanzen(daten);
  });

  const loeschKnopf = document.createElement("button");
  loeschKnopf.textContent = "Löschen";
  loeschKnopf.style.backgroundColor = "#d26464";
  loeschKnopf.style.color = "white";
  loeschKnopf.addEventListener("click", async () => {
    await fetch(`/pflanzen/${pflanze.id}`, { method: "DELETE" });
    const daten = await ladePflanzenVomServer();
    zeigeAllePflanzen(daten);
  });

  const gegossenKnopf = document.createElement("button");
  gegossenKnopf.innerHTML = "✅ Gegossen";
  gegossenKnopf.style.backgroundColor = "#5cb85c";
  gegossenKnopf.style.color = "white";
  gegossenKnopf.style.border = "none";
  gegossenKnopf.style.padding = "0.5em 1em";
  gegossenKnopf.style.borderRadius = "0.3em";
  gegossenKnopf.style.cursor = "pointer";
  gegossenKnopf.style.marginLeft = "0.5em";

  const heute = new Date().toISOString().split("T")[0];
  if (pflanze.datum === heute) {
    gegossenKnopf.innerHTML = "✅ Heute gegossen";
    gegossenKnopf.disabled = true;
    gegossenKnopf.style.opacity = "0.7";
    gegossenKnopf.style.cursor = "default";
  }

  gegossenKnopf.addEventListener("click", async () => {
    pflanze.datum = heute;
    await fetch(`/pflanzen/${pflanze.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pflanze),
    });
    const daten = await ladePflanzenVomServer();
    zeigeAllePflanzen(daten);
  });

  const aktionen = document.createElement("div");
  aktionen.style.marginTop = "0.8em";
  aktionen.style.display = "Flex";
  aktionen.appendChild(bearbeiteKnopf);
  aktionen.appendChild(loeschKnopf);
  aktionen.appendChild(gegossenKnopf);

  kopf.addEventListener("click", () => {
    const offen = details.style.display === "block";
    details.style.display = offen ? "none" : "block";
    pfeil.textContent = offen ? "..." : "▾";
  });

  karte.appendChild(kopf);
  karte.appendChild(giessInfo);
  karte.appendChild(details);
  karte.appendChild(aktionen);
  container.appendChild(karte);
}

async function ladePflanzenVomServer() {
  const res = await fetch("/pflanzen");
  const daten = await res.json();
  return daten.map(p => ({ ...p, id: p._id }));
}


function berechneNaechstesGiessen(pflanze) {
  const heute = new Date();
  const ziel = new Date(pflanze.datum);
  const diffTime = ziel - heute;
  const diffTage = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffTage < 0) return `überfällig (${Math.abs(diffTage)} Tage)`;
  if (diffTage === 0) return "heute";
  if (diffTage === 1) return "morgen";
  return `in ${diffTage} Tagen`;
}
