// 📦 Module laden
const http = require('http');
const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const { URL } = require('url');

// 🔌 MongoDB-Verbindung
const MONGO_URL = 'mongodb://localhost:27017';
const DB_NAME = 'pflanzendb';

const client = new MongoClient(MONGO_URL);
let db, pflanzenCollection;

// 🚀 Server starten
async function startServer() {
  await client.connect();
  db = client.db(DB_NAME);
  pflanzenCollection = db.collection('pflanzen');

  const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    // 🌱 GET /pflanzen
    if (req.method === 'GET' && pathname === '/pflanzen') {
      const daten = await pflanzenCollection.find().toArray();
      const umgewandelt = daten.map(umwandelnMongoId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(umgewandelt));
    }

    // ➕ POST /pflanzen
    else if (req.method === 'POST' && pathname === '/pflanzen') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        const data = JSON.parse(body);
        const result = await pflanzenCollection.insertOne(data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: result.insertedId }));
      });
    }

    // 🔁 PUT /pflanzen/:id
    else if (req.method === 'PUT' && pathname.startsWith('/pflanzen/')) {
      const id = pathname.split('/')[2];
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

    // 🗑️ DELETE /pflanzen/:id
    else if (req.method === 'DELETE' && pathname.startsWith('/pflanzen/')) {
      const id = pathname.split('/')[2];
      await pflanzenCollection.deleteOne({ _id: new ObjectId(id) });
      res.writeHead(200);
      res.end("Gelöscht");
    }

    // 📂 Statische Dateien
    else if (req.method === 'GET') {
      const filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
      const ext = path.extname(filePath);
      const mime = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript',
      };

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

    // ❌ Alles andere
    else {
      res.writeHead(404);
      res.end("Nicht gefunden");
    }
  });

  const PORT = 3000;
  server.listen(PORT, () => console.log(`MyPlants Server läuft auf http://localhost:${PORT}`));
}

startServer().catch(err => {
  console.error("Fehler beim Starten des Servers:", err);
});

// 🧠 MongoDB _id → id
function umwandelnMongoId(pflanze) {
  return { ...pflanze, id: pflanze._id };
}
