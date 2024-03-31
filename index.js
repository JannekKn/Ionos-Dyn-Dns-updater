const express = require('express');
const axios = require('axios');
var http = require('http');
const bodyParser = require('body-parser');
const { exec } = require("child_process");
const fs = require("fs");
require('console-stamp')(console, '[HH:MM:ss.l]'); //ist für mich gerade einfach praktisch
//const { API_Key, filename, ip_check_delay_ms } = require('./config.json');

const API_Key = process.env.API_KEY;
const filename = process.env.FILENAME;
const ip_check_delay_ms = process.env.IP_CHECK_DELAY_MS;

console.log("Environment variables:", process.env);

if (!API_Key) {
  console.error("Error: API_KEY environment variable is not set.");
  process.exit(1);
}

if (!filename) {
  console.error("Error: FILENAME environment variable is not set.");
  process.exit(1);
}

if (!ip_check_delay_ms) {
  console.error("Error: IP_CHECK_DELAY_MS environment variable is not set.");
  process.exit(1);
}


const app = express();
port = 80;
app.use(bodyParser.json());

// Pfade zur Domains-Datei
const domainsFilePath = filename;

var updateUrl = "";
var mycurIP = "";

// Funktion zum Lesen der Domains aus der Datei
function readDomainsFromFile() {
  try {
    const data = fs.readFileSync(domainsFilePath, 'utf8');
    return data.trim().split('\n');
  } catch (err) {
    console.error('Error reading domains file:', err);
    return [];
  }
}

// Funktion zum Schreiben der Domains in die Datei
function writeDomainsToFile(domains) {
  try {
    fs.writeFileSync(domainsFilePath, domains.join('\n'));
  } catch (err) {
    console.error('Error writing domains file:', err);
  }
}

app.get('/', async (req, res) => {
  try {
    // Domains aus der Datei lesen
    const currentDomains = readDomainsFromFile();

    //ich weiß, dass könnte schöner mit frontend und backend in unterschiedlichen files gelöst werden
    let html = `
      <html lang="de">
      <head>
          <title>DynDNS Updater</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
          body {
            background-color: #1a1a1a;
            color: #ffffff;
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
        }
        
        h1 {
            text-align: center;
            text-decoration: underline;
        }
        
        p {
            text-align: center;
        }
        
        #add-form {
            display: flex;
            justify-content: center;
            margin: 20px;
        }
        
        #domain-input {
            padding: 8px;
            border: none;
            border-radius: 4px;
            background-color: #2a2a2a;
            color: #ffffff;
            width: 200px;
        }
        
        #add-button {
            padding: 8px 12px;
            background-color: #007bff;
            border: none;
            border-radius: 4px;
            color: #ffffff;
            cursor: pointer;
        }
        
        #add-button:hover {
            background-color: #0056b3;
        }
        
        #domain-table {
            width: 80%;
            margin: 0 auto;
            border-collapse: collapse;
            margin-top: 20px;
        }
        
        #domain-table th,
        #domain-table td {
            padding: 10px;
            text-align: left;
        }
        
        #domain-table th {
            background-color: #333333;
            color: #ffffff;
        }
        
        #domain-table tr {
            border-bottom: 1px solid #555555;
        }
        
        .delete-button {
            border: none;
            background: none;
            cursor: pointer;
            color: #ff3333;
        }
        
        .delete-button:hover {
            color: #cc0000;
        }
          </style>
      </head>
        <h1>DynDNS Updater Web-UI</h1>
        <p>Ionos Server hat ein ziemlich niedriges Rate-Limit. Also nur Domains einzeln hinzufügen und entfernen.</p>
        <form id="add-form">
          <input type="text" id="domain-input" placeholder="Enter a new domain" required>
          <button type="submit" id="add-button">Add</button>
        </form>
        <table id="domain-table">
          <thead>
            <tr>
              <th>Domain</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
      `;
    // itterate  die Ergebnisse und füge jede Domain als Tabellenzeile hinzu
    for (let [index, domain] of currentDomains.entries()) {
      html += `
          <tr>
            <td>${domain}</td>
            <td><button class="delete-button" data-id="${index + 1}">🗑️</button></td>
          </tr>
        `;
    }
    // ende vom html string nach der tabelle und SENDEN!
    html += `
          </tbody>
        </table>
        <script src="/script.js"></script>
        </html>
      `;
    res.send(html);

  } catch (err) {
    console.error('Error reading domains file:', err);
  }
});

// Route zum einfügen von domains
app.post('/add', async (req, res) => {
  // die neue domain
  const domain = req.body.domain;
  // Überprüfen, ob die Domain gültig ist
  //das match ding ist ausm internet kopiert, falls es hier fehler gibt einfach löschen, ist ja eh nur private nutzung ohnr login usw
  if (domain && domain.match(/^[a-z0-9.-]+\.[a-z]{2,}$/)) {
    // Domains aus Datei lesen, hinzufügen und in Datei schreiben
    const currentDomains = readDomainsFromFile();
    currentDomains.push(domain);
    writeDomainsToFile(currentDomains);


    // antwort ans frontend
    res.json({ message: 'Domain added successfully' });
    //und console...
    console.log("Domain " + domain + " added successfully");
    //nach dem hinzufügen einer domain wird eine neue updateurl erstellt
    updateUpdateURL();
  } else {
    // Sende eine Fehlermeldung als Antwort
    res.json({ message: 'Invalid domain' });
  }
});

// route zum löschen
app.post('/delete', async (req, res) => {
  // id von zu löschender domain
  const id = req.body.id;
  // Überprüfen, ob die ID gültig ist
  //siehe comment bei add
  if (id && id.match(/^[0-9]+$/)) {
    // Domains aus Datei lesen, löschen und in Datei schreiben
    const currentDomains = readDomainsFromFile();
    currentDomains.splice(id - 1, 1); // id startet mit 1
    writeDomainsToFile(currentDomains);

    //antwort ans frontend
    res.json({ message: 'Domain deleted successfully' });
    //und in die console...
    console.log("Domain deleted successfully");

    //Nachdem eine domain gelöscht wurde wird auch eine neue Update URL erstellt, cih weiß aber nicht, ob das nötig ist, ist wohl jedem selber überlassen
    updateUpdateURL();
  } else {
    // Sende Fehlermeldung als Antwort
    res.json({ message: 'Invalid id' });
  }
});

// route fürs script, könnte auch einfach oben sonst mitgegeben werden
//I:teilweise von chatgpt geschrieben, tabelle noch angepasst und so
//ja ist bisschen dumm alles immer zu überschreiben...
app.get('/script.js', (req, res) => {
  let script = `
    // Auswählen der Elemente aus dem Dokument
    const addForm = document.getElementById('add-form');
    const domainInput = document.getElementById('domain-input');
    const addButton = document.getElementById('add-button');
    const domainTable = document.getElementById('domain-table');
    const deleteButtons = document.querySelectorAll('.delete-button');

    // Hinzufügen eines Ereignislisteners für das Formular, um eine neue Domain hinzuzufügen
    addForm.addEventListener('submit', (event) => {
      // Verhindern der Standardaktion des Formulars
      event.preventDefault();
      // Deaktivieren der Schaltfläche, um mehrfache Klicks zu vermeiden
      addButton.disabled = true;
      // Erhalten der Domain aus dem Eingabefeld
      const domain = domainInput.value;
      // Erstellen eines Objekts, das die Domain enthält
      const data = { domain };
      // Erstellen einer Anfrage, um die Domain zur Datenbank hinzuzufügen
      fetch('/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      .then(response => response.json())
      .then(data => {
        // Anzeigen der Nachricht aus der Antwort
        alert(data.message);
        // Aktualisieren der Tabelle, um die neue Domain anzuzeigen
        updateTable();
        // Leeren des Eingabefelds
        domainInput.value = '';
        // Aktivieren der Schaltfläche wieder
        addButton.disabled = false;
      })
      .catch(error => {
        // Anzeigen des Fehlers
        console.error(error);
        // Aktivieren der Schaltfläche wieder
        addButton.disabled = false;
      });
    });

    // Erstellen einer Funktion, um die Tabelle zu aktualisieren
    function updateTable() {
      // Abfragen aller Domains aus der Datenbank
      fetch('/domains')
      .then(response => response.json())
      .then(data => {
        // Leeren des Tabellenkörpers
        domainTable.innerHTML = '';

          let row = document.createElement('tr');
          let cell1 = document.createElement('th');
          cell1.textContent = "";
          let cell2 = document.createElement('th');
          cell1.textContent = "Domains";
          row.appendChild(cell1);
          row.appendChild(cell2);
          domainTable.appendChild(row);


          // Schleife durch die Daten und füge jede Domain als Tabellenzeile hinzu
        for (let domain of data) {
          let row = document.createElement('tr');
          let cell1 = document.createElement('td');
          cell1.textContent = domain.domain;
          let cell2 = document.createElement('td');
          let button = document.createElement('button');
          button.textContent = '🗑️';
          button.className = 'delete-button';
          button.dataset.id = domain.id;
          button.addEventListener('click', deleteDomain);
          cell2.appendChild(button);
          row.appendChild(cell1);
          row.appendChild(cell2);
          domainTable.appendChild(row);
        }
      })
      .catch(error => {
        // Anzeigen des Fehlers
        console.error(error);
      });
    }

    // Erstellen einer Funktion, um eine Domain zu löschen
    function deleteDomain(event) {
      // Erhalten der ID aus dem Datensatz des Elements
      const id = event.target.dataset.id;
      // Erstellen eines Objekts, das die ID enthält
      const data = { id };
      // Erstellen einer Anfrage, um die Domain aus der Datenbank zu löschen
      fetch('/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      .then(response => response.json())
      .then(data => {
        // Anzeigen der Nachricht aus der Antwort
        alert(data.message);
        // Aktualisieren der Tabelle, um die gelöschte Domain zu entfernen
        updateTable();
      })
      .catch(error => {
        // Anzeigen des Fehlers
        console.error(error);
      });
    }

    // Aufrufen der Funktion, um die Tabelle beim Laden der Seite zu aktualisieren
    updateTable();
  `;
  res.set('Content-Type', 'text/javascript');
  res.send(script);
});

// route, um domains zu bekommen
app.get('/domains', (req, res) => {
  // Domains aus Datei lesen
  const currentDomains = readDomainsFromFile();

  // Formatieren der Domains für die JSON-Antwort
  const formattedDomains = currentDomains.map((domain, index) => {
    return {
      id: index + 1,
      domain: domain
    };
  });

  res.json(formattedDomains);
});


// Starten des Servers auf Port 3000
app.listen(port, () => {
  console.log('Server running on port ' + port);
});

// updated die update-url
async function updateUpdateURL() {
  try {
    // Domains aus der Datei lesen
    const currentDomains = readDomainsFromFile();

    const inputdata = {
      domains: currentDomains,
      description: "My DynamicDns Update at " + new Date()
    };

    const response = await axios.post('https://api.hosting.ionos.com/dns/v1/dyndns', inputdata, {
      headers: {
        accept: 'application/json',
        'X-API-Key': API_Key,
        'Content-Type': 'application/json'
      }
    });

    console.log("Neue UpdateURL: " + response.data.updateUrl);
    updateUrl = response.data.updateUrl;
    updateDynDns();
  } catch (error) {
    console.error(error);
  }
}

function updateDynDns() {
  try {
    exec("curl -X GET " + updateUrl, (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
      }
      console.log(`Updated the Domains - stdout: ${stdout}`);
    });
  } catch (error) {
    console.error("error in updateDynDns: " + error);
  }
}

//die löst auch zum anfang aus, da von 0 zu aktueller ip ändert
function checkIP() {

  try {
    http.get({ 'host': 'api.ipify.org', 'port': 80, 'path': '/' }, function (resp) {
      let data = '';

      resp.on('data', function (chunk) {
        data += chunk;
      });

      resp.on('end', function () {
        const ip = data.trim();
        const mycurIPString = mycurIP.toString();
        const ipString = ip.toString();

        if (mycurIPString !== ipString) {
          console.log("The new IP is " + ip);
          mycurIP = ip;
          updateDynDns();
        }
      });
    }).on('error', function (error) {
      console.error("Error in checkAndUpdateIP: " + error);
    });
  } catch (error) {
    console.error("Error in checkAndUpdateIP: " + error);
  }

}


updateUpdateURL();

//check ip every...
setInterval(checkIP, ip_check_delay_ms);
