// Module laden (eingebaute + externe aus Node.js & MongoDB)
const http = require('http');                         // HTTP-Server-Modul
const fs = require('fs');                             // Zum Lesen von Dateien (HTML, CSS, JS)
const path = require('path');                         // Für sichere Pfadverarbeitung
const { MongoClient, ObjectId } = require('mongodb'); // MongoDB-Client & für das Arbeiten mit IDs
const { URL } = require('url');                       // Zum Parsen von URLs

// Verbindung zur lokalen MongoDB
const MONGO_URL = 'mongodb://localhost:27017'; // MongoDB-URL (lokaler Server)
const DB_NAME = 'pflanzendb';                  // Name der verwendeten Datenbank

const client = new MongoClient(MONGO_URL);     // MongoClient-Instanz erzeugen
let db, pflanzenCollection;                    // Später gefüllt mit DB & Collection

// Hauptfunktion zum Starten des Servers
async function startServer() {
  await client.connect();                               // MongoDB-Verbindung aufbauen
  db = client.db(DB_NAME);                              // Datenbank auswählen
  pflanzenCollection = db.collection('pflanzen');       // Collection auswählen

  // HTTP-Server erstellen
  const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`); // vollständige URL analysieren
    const pathname = parsedUrl.pathname;                               // nur Pfad extrahieren (z. B. /pflanzen)

    // GET /pflanzen – Alle Pflanzen aus der Datenbank holen
    if (req.method === 'GET' && pathname === '/pflanzen') {
      const daten = await pflanzenCollection.find().toArray();       // Alle Datensätze holen
      const umgewandelt = daten.map(umwandelnMongoId);               // _id → id umwandeln für Frontend
      res.writeHead(200, { 'Content-Type': 'application/json' });    // Erfolg mit JSON
      res.end(JSON.stringify(umgewandelt));                          // Antwort senden
    }

    // POST /pflanzen – Neue Pflanze speichern
    // von ChatGPT korregieren lassen und nach dem muster die anderen gemacht
    else if (req.method === 'POST' && pathname === '/pflanzen') {
      let body = '';
      req.on('data', chunk => body += chunk);                        // Daten vom Client lesen
      req.on('end', async () => {
        const data = JSON.parse(body);                               // JSON-Daten umwandeln
        const result = await pflanzenCollection.insertOne(data);     // In MongoDB einfügen
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: result.insertedId }));          // Neue ID zurücksenden
      });
    }

    // PUT /pflanzen/:id – Eine Pflanze aktualisieren
    else if (req.method === 'PUT' && pathname.startsWith('/pflanzen/')) {
      const id = pathname.split('/')[2];                             // ID aus URL extrahieren
      let body = '';
      req.on('data', chunk => body += chunk);                        // Daten lesen
      req.on('end', async () => {
        const data = JSON.parse(body);                               // JSON parsen
        delete data._id;                                             // _id darf nicht verändert werden!

        await pflanzenCollection.updateOne(
          { _id: new ObjectId(id) },                                 // Suche nach ID
          { $set: data }                                             // Daten ersetzen
        );

        res.writeHead(200);
        res.end("OK");                                               // Erfolg senden
      });
    }

    // DELETE /pflanzen/:id – Pflanze löschen
    else if (req.method === 'DELETE' && pathname.startsWith('/pflanzen/')) {
      const id = pathname.split('/')[2];                             // ID extrahieren
      await pflanzenCollection.deleteOne({ _id: new ObjectId(id) }); // Eintrag löschen
      res.writeHead(200);
      res.end("Gelöscht");                                           // Erfolgsmeldung
    }

    // Statische Dateien (index.html, style.css, script.js)
    else if (req.method === 'GET') {
      const filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
      const ext = path.extname(filePath);                            // Dateityp erkennen (z. B. .html)
      const mime = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript',
      };

      fs.readFile(filePath, (err, data) => {                         // Datei lesen
        if (err) {
          res.writeHead(404);
          res.end('404 Not Found');                                  // Datei nicht gefunden
        } else {
          res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
          res.end(data);                                             // Datei senden
        }
      });
    }

    // Keine Route gefunden
    else {
      res.writeHead(404);
      res.end("Nicht gefunden");                                     // Fehler-Rückmeldung
    }
  });

  // Server starten
  const PORT = 3000;
  server.listen(PORT, () =>
    console.log(`MyPlants Server läuft auf http://localhost:${PORT}`)
  );
}

// Wenn beim Starten Fehler auftreten
startServer().catch(err => {
  console.error("Fehler beim Starten des Servers:", err);
});

// Hilfsfunktion: Wandelt MongoDB _id zu id (für JSON im Frontend)
//ChatGPT
function umwandelnMongoId(pflanze) {
  return { ...pflanze, id: pflanze._id };  // kopiert alles & ergänzt id
}
