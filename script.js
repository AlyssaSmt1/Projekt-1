// Sobald das Dokument vollständig geladen ist läuft der code
document.addEventListener("DOMContentLoaded", () => {
  // Alle gespeicherten Pflanzen aus dem localStorage laden und anzeigen
  const pflanzen = ladePflanzen();
  zeigeAllePflanzen(pflanzen);

  // Formular absenden (neue Pflanze hinzufügen)
  document.getElementById("pflanzen-form").addEventListener("submit", function (e) {
    e.preventDefault(); // Verhindert Neuladen der Seite

    const neuePflanze = sammleFormularDaten(); // Daten aus Formular sammeln
    if (!neuePflanze) return; // Abbruch wenn Pflichtfelder fehlen

    const daten = ladePflanzen(); // Vorhandene Pflanzen laden (aus dem Speicher) 
    daten.push(neuePflanze); // Neue hinzufügen
    speichereAllePflanzen(daten);  // Geänderte Liste speichern
    zeigeAllePflanzen(daten); // Anzeigen der Pflanzen aktualisieren
    this.reset(); // Chat GPT, weil ich nicht wusste wie ich das Formular zurücksetzen kann
  });

  // Dropdown für Sortierfunktion erstellen
  //Mit hilfe von ChatGPT
  const sortAuswahl = document.createElement("select");
  sortAuswahl.innerHTML = `
    <option value="">Sortieren nach...</option>
    <option value="spitzname">Spitzname A-Z</option>
    <option value="datum">Gießdatum</option>
  `;
  sortAuswahl.style.marginBottom = "1em"; // Abstand unter dem Dropdown menü

  // Beim Wechseln der Auswahl sortieren 
  sortAuswahl.addEventListener("change", () => {
    const daten = ladePflanzen(); // Pflanzen erneut laden
    if (sortAuswahl.value === "spitzname") {  // Alphabetisch nach Spitzname sortieren
      daten.sort((a, b) => a.spitzname.localeCompare(b.spitzname)); // mit hilfe von Chat GPT
    } else if (sortAuswahl.value === "datum") { // Nach Datum sortieren
      daten.sort((a, b) => new Date(a.datum) - new Date(b.datum));
    }
    zeigeAllePflanzen(daten); // Aktualisierte Sortierung anzeigen
  });

  // Dropdown ins DOM einfügen (am Anfang der Pflanzenliste)
  document.querySelector(".pflanzen-liste").prepend(sortAuswahl);
});



// --- Funktionen ---!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

// Daten aus dem Formular sammeln und als Objekt zurückgeben
function sammleFormularDaten() {
  // Formularfelder auslesen (mit value)
  const emoji = document.getElementById("pflanzen-emoji").value;
  const spitzname = document.getElementById("spitzname").value.trim(); //trim entfernt leerzeichen am anfang und ende von string
  const pflanzenart = document.getElementById("pflanzenart").value.trim();
  const licht = document.getElementById("licht").value;
  const wasserMenge = document.getElementById("wasser-menge").value;
  const wasserEinheit = document.getElementById("waesserungs-einheit").value;
  const datum = document.getElementById("start-datum").value;
  const beschreibung = document.getElementById("beschreibung").value.trim();

  // Pflichtfelder prüfen (ob es leer ist)

  if (!spitzname || !pflanzenart || !licht || !wasserMenge || !datum) {
    alert("Bitte alle Pflichtfelder ausfüllen."); // Alert command von ChatGPT, weil sonst es man nicht wusse was falsch war
    return null;
  }

  // Intervalltext für Bewäasserung erstellen
  let wasserText = `${wasserMenge} ${wasserEinheit}`;
  if (wasserEinheit.includes("Tag")) {
    wasserText = `${wasserMenge} Tag`;
  } else if (wasserEinheit.includes("Woche")) {
    wasserText = `${wasserMenge} Woche`;
  } else if (wasserEinheit.includes("Monat")) {
    wasserText = `${wasserMenge} Monat`;
  }

  // Neues Pflanzenobjekt erstellen
  return {
    id: Date.now(), // Eindeutige ID basierend auf aktuelle Zeit
    emoji,
    spitzname,
    pflanzenart,
    licht,
    wasser: wasserText,
    datum,
    beschreibung
  };
}


// Alle Pflanzen auf der Seite anzeigen
function zeigeAllePflanzen(daten) {
  const container = document.getElementById("pflanzen-anzeige");
  container.innerHTML = ""; // Vorherige Inhalte löschen

  // Alle Pflanzenkarten anzeigen
  daten.forEach(p => zeigePflanze(p));
}


// Einzelne Pflanzenkarte anzeigen
function zeigePflanze(pflanze) {
  const container = document.getElementById("pflanzen-anzeige");

  // Karte für eine Pflanze erstellen
  const karte = document.createElement("div");
  karte.className = "pflanzenkarte";
  karte.dataset.id = pflanze.id;

  // Kopfbereich mit Emoji und Name
  const kopf = document.createElement("div");
  kopf.className = "pflanzenkopf";
  kopf.style.cursor = "pointer";
  kopf.style.display = "flex";
  kopf.style.justifyContent = "space-between";
  kopf.style.alignItems = "center";

  // Pfeil-Symbol für Aus-/ und Einklappen
  const pfeil = document.createElement("span");
  pfeil.textContent = "..."; // geschlossener Zustand
  pfeil.style.transition = "transform 0.2s"; // weichere Animation wenn es auf gemacht wird

  // Titelzeile
  const kopfText = document.createElement("span");
  kopfText.textContent = `${pflanze.emoji} ${pflanze.spitzname} (${pflanze.pflanzenart})`;

  kopf.appendChild(kopfText);
  kopf.appendChild(pfeil);

  // Detailbereich (am anfang versteckt)
  const details = document.createElement("div");
  details.className = "pflanzendetails";
  details.style.display = "none";
  details.innerHTML = `
    💧 Wässerung: ${pflanze.wasser}<br />
    ☀️ Licht: ${pflanze.licht}<br />
    📅 Ab: ${pflanze.datum}<br />
    📝 ${pflanze.beschreibung}
  `;


// Nächstes Gießdatum berechnen
  const naechstesGiessen = berechneNaechstesGiessen(pflanze);
  const giessInfo = document.createElement("div");
  giessInfo.textContent = `📅 Nächstes Gießen: ${naechstesGiessen}`;


  // Bearbeiten-Knopf
  const bearbeiteKnopf = document.createElement("button");
  bearbeiteKnopf.textContent = "Bearbeiten";
  bearbeiteKnopf.style.marginRight = "0.5em";
  bearbeiteKnopf.addEventListener("click", () => bearbeitePflanze(pflanze.id));


  // Löschen-Knopf
  const loeschKnopf = document.createElement("button");
  loeschKnopf.textContent = "Löschen";
  loeschKnopf.style.backgroundColor = "#d26464";
  loeschKnopf.style.color = "white"; 
  loeschKnopf.addEventListener("click", () => {
    let daten = ladePflanzen().filter(p => p.id !== pflanze.id);
    speichereAllePflanzen(daten);
    zeigeAllePflanzen(daten);
  });

  // Gegossen-Knopf
  const gegossenKnopf = document.createElement("button");
  gegossenKnopf.innerHTML = "✅ Gegossen";
  gegossenKnopf.style.backgroundColor = "#5cb85c";
  gegossenKnopf.style.color = "white";
  gegossenKnopf.style.border = "none";
  gegossenKnopf.style.padding = "0.5em 1em";
  gegossenKnopf.style.borderRadius = "0.3em";
  gegossenKnopf.style.cursor = "pointer";
  gegossenKnopf.style.marginLeft = "0.5em";


  // Prüfen, ob heute schon gegossen wurde
  const heute = new Date().toISOString().split("T")[0];
  if (pflanze.datum === heute) {
    gegossenKnopf.innerHTML = "✅ Heute gegossen";
    gegossenKnopf.disabled = true;
    gegossenKnopf.style.opacity = "0.7";
    gegossenKnopf.style.cursor = "default";
  }

 // Beim Klicken: Datum auf heute setzen
  gegossenKnopf.addEventListener("click", () => {
    const daten = ladePflanzen();
    const index = daten.findIndex(p => p.id === pflanze.id);
    if (index !== -1) {
      daten[index].datum = heute;
      speichereAllePflanzen(daten);
      zeigeAllePflanzen(daten); // Anzeige aktualisieren
    }
  });

  // Bereich für Knöpfe
  const aktionen = document.createElement("div");
  aktionen.style.marginTop = "0.8em";
  aktionen.style.display = "Flex";
  aktionen.appendChild(bearbeiteKnopf);
  aktionen.appendChild(loeschKnopf);
  aktionen.appendChild(gegossenKnopf);

  // Kopf klickbar machen, damit teile versteckt sind
  kopf.addEventListener("click", () => {
    const offen = details.style.display === "block";  //Mit hilfe von ChatGPT
    details.style.display = offen ? "none" : "block"; //Mit hilfe von ChatGPT
    pfeil.textContent = offen ? "..." : "▾"; // Bedingung ? Ausdruck_wenn_wahr : Ausdruck_wenn_falsch
  });

// Alles(Karte) zusammensetzen
  karte.appendChild(kopf);
  karte.appendChild(giessInfo);
  karte.appendChild(details);
  karte.appendChild(aktionen);
  container.appendChild(karte);
}



// Bestehende Pflanze bearbeiten, Daten zurück ins Formular laden
function bearbeitePflanze(id) {
  const daten = ladePflanzen();
  const pflanze = daten.find(p => p.id === id);
  if (!pflanze) return;

 // Formular mit bestehenden Daten füllen
  document.getElementById("pflanzen-emoji").value = pflanze.emoji;
  document.getElementById("spitzname").value = pflanze.spitzname;
  document.getElementById("pflanzenart").value = pflanze.pflanzenart;
  document.getElementById("licht").value = pflanze.licht;

   // Wasserintervall zerlegen (z. B. "2 Woche")
  const teile = pflanze.wasser.split(" "); //.split zerteilt den text in leerzeichen
  document.getElementById("wasser-menge").value = teile[0]; //Array Zahl(Wasser-menge)
  document.getElementById("waesserungs-einheit").value = teile[1]; //Array Wie oft (Woche)

  document.getElementById("start-datum").value = pflanze.datum;
  document.getElementById("beschreibung").value = pflanze.beschreibung;

  // Alte Pflanze entfernen (wird nach Bearbeitung neu gespeichert)
  const neueDaten = daten.filter(p => p.id !== id);
  speichereAllePflanzen(neueDaten);
  zeigeAllePflanzen(neueDaten);
}



// Pflanzen aus dem localStorage laden
function ladePflanzen() {
  const daten = localStorage.getItem("pflanzen");
  return daten ? JSON.parse(daten) : [];      // Wenn nichts gespeichert, leeres Array zurückgeben, Hilfe von ChatGPT
// JSON.parse = JSON String zu JavaScript-Objekt
}

// Pflanzen im localStorage speichern, Daten bleiben dauerhaft gespeichert
function speichereAllePflanzen(daten) {
  localStorage.setItem("pflanzen", JSON.stringify(daten));  // Objekt zu JSON-String
}

// Nächstes Gießdatum berechnen
//Mit Hilfe von ChatGPT
function berechneNaechstesGiessen(pflanze) {
  const heute = new Date(); // aktuelles Datum
  const ziel = new Date(pflanze.datum); // gespeichertes Gießdatum
  const diffTime = ziel - heute;  // Zeitunterschied in Millisekunden
  const diffTage = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // in Tage berechnen 
  // (math.ceil  ChatGPT)

  if (diffTage < 0) return `überfällig (${Math.abs(diffTage)} Tage)`; // gießen bereits überfällig 
  if (diffTage === 0) return "heute"; // heute fällig
  if (diffTage === 1) return "morgen";  // morgen fällig
  return `in ${diffTage} Tagen`;  // sonst in x Tagen
}
