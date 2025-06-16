// 📦 Standard-Module laden
const http = require('http');           // HTTP-Server
const fs = require('fs');               // Dateien lesen
const path = require('path');           // Pfade auflösen
const { MongoClient, ObjectId } = require('mongodb'); // MongoDB Client + ObjectId
const { URL } = require('url');         // URL-Parsing

// 🔌 Verbindung zur lokalen MongoDB
const MONGO_URL = 'mongodb://localhost:27017';
const DB_NAME = 'pflanzendb'; // Name deiner Datenbank

const client = new MongoClient(MONGO_URL);
let db, pflanzenCollection;

// 🔁 Starte den Server
async function startServer() {
  // ➕ MongoDB-Verbindung aufbauen
  await client.connect();
  db = client.db(DB_NAME);
  pflanzenCollection = db.collection('pflanzen'); // Tabelle/Sammlung

  // 🌐 HTTP-Server erstellen
  const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    // 📂 Statische Dateien (HTML, CSS, JS)
    if (req.method === 'GET' && pathname.startsWith('/')) {
      const filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
      const ext = path.extname(filePath);
      const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('404 Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
          res.end(data);
        }
      });
    }

    // 🌱 GET /pflanzen → Alle Pflanzen aus Datenbank holen
    else if (req.method === 'GET' && pathname === '/pflanzen') {
      const daten = await pflanzenCollection.find().toArray(); // Alle Pflanzen holen
      const umgewandelt = daten.map(umwandelnMongoId);         // _id → id umwandeln
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(umgewandelt));
    }

    // ➕ POST /pflanzen → Neue Pflanze speichern
    else if (req.method === 'POST' && pathname === '/pflanzen') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        const data = JSON.parse(body);
        const result = await pflanzenCollection.insertOne(data); // Pflanze einfügen
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: result.insertedId })); // ID zurückgeben
      });
    }

    // 🔁 PUT /pflanzen/:id → Pflanze bearbeiten
    else if (req.method === 'PUT' && pathname.startsWith('/pflanzen/')) {
      const id = pathname.split('/')[2]; // ID aus URL holen
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        const data = JSON.parse(body);
        await pflanzenCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: data }
        );
        res.writeHead(200);
        res.end("OK");
      });
    }

    // 🗑️ DELETE /pflanzen/:id → Pflanze löschen
    else if (req.method === 'DELETE' && pathname.startsWith('/pflanzen/')) {
      const id = pathname.split('/')[2];
      await pflanzenCollection.deleteOne({ _id: new ObjectId(id) });
      res.writeHead(200);
      res.end("Gelöscht");
    }

    // ❌ Alle anderen Routen
    else {
      res.writeHead(404);
      res.end("Nicht gefunden");
    }
  });

  // 🟢 Server starten
  const PORT = 3000;
  server.listen(PORT, () => console.log(`MyPlants Server läuft auf http://localhost:${PORT}`));
}

// 🚀 Serverstart aufrufen
startServer().catch(err => {
  console.error("Fehler beim Starten des Servers:", err);
});

// 🧠 Hilfsfunktion zum Umwandeln von Mongo _id → id
function umwandelnMongoId(pflanze) {
  return { ...pflanze, id: pflanze._id };
}
