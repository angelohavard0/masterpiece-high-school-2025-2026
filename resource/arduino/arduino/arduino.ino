#include <SPI.h>
#include <Ethernet2.h>
#include <SoftwareSerial.h>

// =========================
// CONFIG RESEAU
// =========================
byte mac[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED };

IPAddress arduinoIp(192, 168, 50, 5);
IPAddress dnsServer(192, 168, 50, 1);
IPAddress gateway(192, 168, 50, 1);
IPAddress subnet(255, 255, 255, 0);
IPAddress serverIp(192, 168, 50, 1);

const int serverPort = 3000;
const char* routePath = "/access";
const char* bearerToken = "token de arduino 1";

// =========================
// CONFIG RFID
// =========================
#define RFID_RX 3
#define RFID_TX 2

SoftwareSerial rfidSerial(RFID_TX, RFID_RX);

// =========================
// VARIABLES RFID
// =========================
byte buffer[30];
int bufferIndex = 0;
bool lectureEnCours = false;
unsigned long lastByteTime = 0;

// =========================
// VARIABLES SAISIE MANUELLE
// =========================
String manualInput = "";
bool manualComplete = false;

// =========================
// SETUP
// =========================
void setup() {
  Serial.begin(115200);

  // Ethernet
  pinMode(10, OUTPUT);
  pinMode(4, OUTPUT);
  digitalWrite(4, HIGH);

  #if defined(__AVR_ATmega2560__)
    pinMode(53, OUTPUT);
  #endif

  Ethernet.begin(mac, arduinoIp, dnsServer, gateway, subnet);
  delay(1000);

  Serial.println("========================================");
  Serial.println("SYSTEME DE CONTROLE D'ACCES");
  Serial.print("IP Arduino: ");
  Serial.println(Ethernet.localIP());
  Serial.print("Serveur: ");
  Serial.print(serverIp);
  Serial.print(":");
  Serial.println(serverPort);
  Serial.println("========================================");

  // RFID
  rfidSerial.begin(9600);

  Serial.println("Lecteur RFID pret (9600 bauds)");
  Serial.println("Passez un badge ou tapez un code + ENTER");
  Serial.println();
}

// =========================
// LOOP
// =========================
void loop() {
  // ===== LECTURE RFID =====
  while (rfidSerial.available()) {
    byte b = rfidSerial.read();

    // Affichage debug HEX des octets reçus
    if (b < 16) Serial.print("0");
    Serial.print(b, HEX);
    Serial.print(" ");

    // Début de trame (STX = 0x02)
    if (b == 0x02) {
      bufferIndex = 0;
      lectureEnCours = true;
      buffer[bufferIndex++] = b;
      lastByteTime = millis();
    }
    else if (lectureEnCours) {
      if (bufferIndex < (int)sizeof(buffer)) {
        buffer[bufferIndex++] = b;
      }
      lastByteTime = millis();

      // Fin de trame (ETX = 0x03)
      if (b == 0x03) {
        lectureEnCours = false;

        Serial.println();
        Serial.print("Donnees recues: ");

        for (int i = 0; i < bufferIndex; i++) {
          if (buffer[i] < 16) Serial.print("0");
          Serial.print(buffer[i], HEX);
          Serial.print(" ");
        }
        Serial.println();

        // Extraire UID entre STX et ETX
        String uid = "";
        for (int i = 1; i < bufferIndex - 1; i++) {
          uid += (char)buffer[i];
        }

        uid.trim();
        uid.toUpperCase();

        Serial.print("UID extrait: ");
        Serial.println(uid);
        Serial.println();

        if (uid.length() > 0) {
          sendToServer(uid);
        } else {
          Serial.println("ERREUR: UID vide");
          Serial.println();
        }

        bufferIndex = 0;
      }
    }
  }

  // Timeout trame RFID incomplète
  if (lectureEnCours && (millis() - lastByteTime > 200)) {
    Serial.println();
    Serial.println("Timeout lecture RFID");
    lectureEnCours = false;
    bufferIndex = 0;
  }

  // ===== SAISIE MANUELLE =====
  while (Serial.available()) {
    char c = Serial.read();

    if (c == '\n' || c == '\r') {
      if (manualInput.length() > 0) {
        manualComplete = true;
      }
    } else {
      manualInput += c;
    }
  }

  if (manualComplete) {
    manualInput.trim();

    if (manualInput.length() > 0) {
      Serial.println("========================================");
      Serial.print("Saisie manuelle: ");
      Serial.println(manualInput);
      sendToServer(manualInput);
    }

    manualInput = "";
    manualComplete = false;
  }

  delay(10);
}

// =========================
// ENVOI AU SERVEUR
// =========================
void sendToServer(String uid) {
  Serial.print("Envoi au serveur... ");

  int code = sendHttpRequest(uid.c_str());

  switch (code) {
    case 200:
      Serial.println("ACCES AUTORISE ✓");
      break;

    case 401:
      Serial.println("ERREUR 401: TOKEN ARDUINO INVALIDE / NON AUTORISE");
      break;

    case 403:
      Serial.println("ACCES REFUSE ✗ (badge inconnu ou supprime)");
      break;

    case 400:
      Serial.println("ERREUR 400: REQUETE INVALIDE (UID manquant ?)");
      break;

    case 500:
      Serial.println("ERREUR 500: ERREUR SERVEUR");
      break;

    case -1:
      Serial.println("ERREUR: Serveur injoignable");
      break;

    case -2:
      Serial.println("ERREUR: Timeout ou reponse HTTP invalide");
      break;

    default:
      Serial.print("ERREUR HTTP: ");
      Serial.println(code);
      break;
  }

  Serial.println();
}

// =========================
// REQUETE HTTP POST
// =========================
int sendHttpRequest(const char* uid) {
  EthernetClient client;

  // Connexion TCP au serveur
  if (!client.connect(serverIp, serverPort)) {
    return -1; // Serveur injoignable
  }

  // Corps JSON attendu par ton backend : { "UID": "xxxx" }
  char jsonBody[128];
  snprintf(jsonBody, sizeof(jsonBody), "{\"UID\":\"%s\"}", uid);
  int length = strlen(jsonBody);

  // ===== Envoi requête HTTP =====
  client.print("POST ");
  client.print(routePath);
  client.println(" HTTP/1.1");

  client.print("Host: ");
  client.print(serverIp[0]);
  client.print(".");
  client.print(serverIp[1]);
  client.print(".");
  client.print(serverIp[2]);
  client.print(".");
  client.println(serverIp[3]);

  client.print("Authorization: Bearer ");
  client.println(bearerToken);

  client.println("Connection: close");
  client.println("Content-Type: application/json");
  client.print("Content-Length: ");
  client.println(length);
  client.println();

  client.print(jsonBody);

  // Debug
  Serial.println();
  Serial.println("----- REQUETE ENVOYEE -----");
  Serial.print("POST ");
  Serial.print(routePath);
  Serial.println(" HTTP/1.1");
  Serial.print("Authorization: Bearer ");
  Serial.println(bearerToken);
  Serial.println("Content-Type: application/json");
  Serial.print("Body: ");
  Serial.println(jsonBody);
  Serial.println("---------------------------");

  // ===== Lecture de la 1ere ligne HTTP =====
  char line[64];
  int idx = 0;
  unsigned long start = millis();

  while ((millis() - start) < 5000) {
    while (client.available()) {
      char c = client.read();

      if (c == '\n') {
        line[idx] = '\0';

        // Debug ligne reçue
        if (idx > 0) {
          Serial.print("HTTP line: ");
          Serial.println(line);
        }

        // Exemple attendu : HTTP/1.1 200 OK
        if (strncmp(line, "HTTP/", 5) == 0) {
          char* firstSpace = strchr(line, ' ');
          if (firstSpace) {
            int code = atoi(firstSpace + 1);
            client.stop();
            return code;
          }
        }

        idx = 0;
      }
      else if (c != '\r') {
        if (idx < (int)(sizeof(line) - 1)) {
          line[idx++] = c;
        }
      }

      // reset timeout si on reçoit des données
      start = millis();
    }

    // Si serveur fermé et plus rien à lire
    if (!client.connected() && !client.available()) {
      break;
    }
  }

  client.stop();
  return -2; // Timeout / réponse invalide
}