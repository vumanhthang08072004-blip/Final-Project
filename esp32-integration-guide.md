# ESP32 Integration Guide for AgriSmart

This guide explains how to connect your ESP32 microcontroller and its associated sensors to the NestJS backend via HTTP POST or MQTT.

## Hardware Connections

### I2C Protocol
Ensure all I2C devices (`BME280`, `MAX44009`, `DS3231`) share the same SDA (e.g., GPIO 21) and SCL (e.g., GPIO 22) pins on the ESP32.

| Sensor                       | Protocol / Pin | ESP32 Pin                  | Notes                                                                 |
| ---------------------------- | -------------- | -------------------------- | --------------------------------------------------------------------- |
| **BME280** (Temp/Hum/Press)  | I2C            | SDA -> 21, SCL -> 22       | Powers via 3.3V                                                        |
| **MAX44009** (Light Lux)     | I2C            | SDA -> 21, SCL -> 22       | High-precision brightness                                             |
| **DS3231** (RTC)             | I2C            | SDA -> 21, SCL -> 22       | Time sync backup                                                       |
| **Capacitive Soil v1.2**     | Analog IN      | A0 -> e.g., GPIO 34 (ADC1)| Ensure you calibrate dry/wet values to calculate a clean 0-100% value. |

## Data Payload Format

Your backend expects a JSON payload matching the `CreateSensorDataDto`. Have your ESP32 structure the payload exactly like this:

```json
{
  "deviceId": "ESP32_Orchard_01",
  "soilMoisture": 45.2,
  "airHumidity": 65.5,
  "airTemperature": 28.3,
  "lightIntensity": 50000.0,
  "pressure": 1012.4
}
```

## Example: Arduino / C++ Code Snippet (HTTP POST)

If you are using WiFi and an `HTTP POST` request to send telemetry data to the NestJS backend, you can use the `<HTTPClient.h>` standard library.

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PWD";
const char* serverUrl = "http://YOUR_NESTJS_IP:3000/api/sensor-data";

// Sensor initialization codes here...

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("Connected!");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    // Gather data from sensors (mock example)
    float soil_pct = 45.2; // Call your soil calibration logic here
    float hum = 65.5;      // Call BME280.readHumidity()
    float temp = 28.3;     // Call BME280.readTemperature()
    float lux = 50000;     // Call MAX44009.getLux()
    float press = 1012.4;  // Call BME280.readPressure()

    // Serialize JSON
    StaticJsonDocument<200> doc;
    doc["deviceId"] = "ESP32_Orchard_01";
    doc["soilMoisture"] = soil_pct;
    doc["airHumidity"] = hum;
    doc["airTemperature"] = temp;
    doc["lightIntensity"] = lux;
    doc["pressure"] = press;

    String requestBody;
    serializeJson(doc, requestBody);

    // Send the POST request
    int httpResponseCode = http.POST(requestBody);

    if (httpResponseCode > 0) {
      Serial.printf("HTTP Response code: %d\n", httpResponseCode);
    } else {
      Serial.printf("Error code: %d\n", httpResponseCode);
    }
    http.end();
  }
  
  // Sleep or delay depending on required reporting frequency (e.g., 5 mins)
  delay(300000); 
}
```

## Moving to MQTT
If you decide to use MQTT to conserve battery life and allow **Two-way communication (Pump Control)**, ensure the NestJS app installs `@nestjs/microservices`. The ESP32 uses the `PubSubClient` library to publish sensor data and subscribe to commands.

### ESP32 Full MQTT + Pump Control Code (`.ino`)
```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <ArduinoJson.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include "Max44009.h"
#include "RTClib.h"
#include "time.h"

// --- Cấu hình WiFi & MQTT ---
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PWD";
const char* mqtt_server = "broker.hivemq.com";
const char* mqtt_topic_pub = "bkhn/thang/sensors";    
const char* mqtt_topic_sub = "bkhn/thang/pump/control";       

// --- Cấu hình chân cảm biến & Relay ---
const int SOIL_PIN = 34; 
const int LDR_PIN = 32;  
const int PUMP_PIN = 23; 

// --- Cấu hình NTP ---
const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 7 * 3600; 
const int   daylightOffset_sec = 0;

WiFiClient espClient;
PubSubClient client(espClient);
Adafruit_BME280 bme;
Max44009 max44009(0x4A); // BME280 Address might be 0x76 or 0x77
RTC_DS3231 rtc;

void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) message += (char)payload[i];

  // Phân tích cú pháp JSON: {"state":"ON"}
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, message);

  if (error) {
    Serial.print("Failed to parse JSON: ");
    Serial.println(error.c_str());
    return;
  }

  const char* state = doc["state"];
  
  if (state != nullptr) {
    if (String(state) == "ON") {
      digitalWrite(PUMP_PIN, HIGH); 
      Serial.println(">>> DA BAT BOM NAY server goi");
    } else if (String(state) == "OFF") {
      digitalWrite(PUMP_PIN, LOW);
      Serial.println(">>> DA TAT BOM NAY server goi");
    }
  }
}

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);
  
  pinMode(LDR_PIN, INPUT);
  pinMode(PUMP_PIN, OUTPUT);
  digitalWrite(PUMP_PIN, LOW); 

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
  
  // Initialization of modules
  rtc.begin();
  bme.begin(0x76);
  
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback); 
}

void reconnect() {
  while (!client.connected()) {
    if (client.connect("ESP32_Orchard_Client")) {
      client.subscribe(mqtt_topic_sub); 
    } else {
      delay(5000);
    }
  }
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop(); // Must be called regularly to process incoming mqtt messages

  static unsigned long lastMsg = 0;
  if (millis() - lastMsg > 5000) {
    lastMsg = millis();
    // Publish sensor payload to mqtt_topic_pub...
  }
}
```
