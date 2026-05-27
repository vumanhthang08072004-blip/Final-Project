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
const char* ssid = "Thang";
const char* password = "88888888";
const char* mqtt_server = "broker.hivemq.com";
const char* mqtt_topic_pub = "bkhn/thang/sensors";    
// Lưu ý: Đổi topic này để khớp với topic mà Backend NestJS bắn lệnh điều khiển bơm
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
Max44009 max44009(0x4A);
RTC_DS3231 rtc;

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Lenh tu Server [");
  Serial.print(topic);
  Serial.print("]: ");
  
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);

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
      Serial.println(">>> DA BAT BOM");
    } else if (String(state) == "OFF") {
      digitalWrite(PUMP_PIN, LOW);
      Serial.println(">>> DA TAT BOM");
    }
  }
}

void syncTime() {
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("Loi: Khong lay duoc thoi gian tu NTP");
    return;
  }
  rtc.adjust(DateTime(timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday, 
                      timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec));
  Serial.println("Dong bo RTC thanh cong!");
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Dang ket noi MQTT...");
    String clientId = "ESP32_Thang_" + String(random(0xffff), HEX);
    if (client.connect(clientId.c_str())) {
      Serial.println("Da ket noi!");
      client.subscribe(mqtt_topic_sub); 
    } else {
      Serial.print("Loi ket noi, ma loi=");
      Serial.print(client.state());
      Serial.println(" Thu lai sau 5 giay...");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);
  
  pinMode(LDR_PIN, INPUT);
  pinMode(PUMP_PIN, OUTPUT);
  // Đảm bảo bơm bị tắt khi vừa cắm điện
  digitalWrite(PUMP_PIN, LOW); 

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nWiFi Connected!");

  if (!rtc.begin()) Serial.println("RTC Error!");
  if (!bme.begin(0x76)) Serial.println("BME280 Error!");
  
  syncTime();
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback); 
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  // Duy trì kết nối MQTT để nhận lệnh liên tục
  client.loop();

  static unsigned long lastMsg = 0;
  unsigned long now_ms = millis();
  
  if (now_ms - lastMsg > 5000) {
    lastMsg = now_ms;

    DateTime now = rtc.now();
    char timestamp[25];
    sprintf(timestamp, "%04d-%02d-%02d %02d:%02d:%02d", 
            now.year(), now.month(), now.day(), 
            now.hour(), now.minute(), now.second());

    float temp = bme.readTemperature();
    float hum = bme.readHumidity();
    float lux = max44009.getLux();
    int ldrStatus = digitalRead(LDR_PIN);
    int soilRaw = analogRead(SOIL_PIN);
    
    int soilPercent = map(soilRaw, 4095, 1500, 0, 100);
    soilPercent = constrain(soilPercent, 0, 100);

    String payload = "{";
    payload += "\"time\":\"" + String(timestamp) + "\",";
    payload += "\"temp\":" + String(temp, 1) + ",";
    payload += "\"hum\":" + String(hum, 1) + ",";
    payload += "\"lux\":" + String(lux, 1) + ",";
    payload += "\"light_detect\":" + String(ldrStatus == LOW ? "true" : "false") + ",";
    payload += "\"soil\":" + String(soilPercent);
    payload += "}";

    client.publish(mqtt_topic_pub, payload.c_str());
    Serial.println("Sent: " + payload);
  }
}
