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
const int PUMP_PIN = 23; 

// --- Cấu hình RS485 cho cảm biến NPK ---
#define NPK_RX_PIN 16   // GPIO16 - RX (nhận từ MAX485 RO)
#define NPK_TX_PIN 17   // GPIO17 - TX (gửi tới MAX485 DI)
#define NPK_DE_RE_PIN 4 // GPIO4  - DE/RE (chuyển chế độ truyền/nhận)

HardwareSerial NPKSerial(2); // Sử dụng UART2 của ESP32

// Modbus RTU request frames cho cảm biến NPK (địa chỉ mặc định 0x01)
// Đọc Nitrogen (N): Register 0x001E, Length 1
const byte nitrogenRequest[] = {0x01, 0x03, 0x00, 0x1E, 0x00, 0x01, 0xE4, 0x0C};
// Đọc Phosphorus (P): Register 0x001F, Length 1
const byte phosphorusRequest[] = {0x01, 0x03, 0x00, 0x1F, 0x00, 0x01, 0xB5, 0xCC};
// Đọc Potassium (K): Register 0x0020, Length 1
const byte potassiumRequest[] = {0x01, 0x03, 0x00, 0x20, 0x00, 0x01, 0x85, 0xC0};

// --- Cấu hình NTP ---
const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 7 * 3600; 
const int   daylightOffset_sec = 0;

WiFiClient espClient;
PubSubClient client(espClient);
Adafruit_BME280 bme;
Max44009 max44009(0x4A);
RTC_DS3231 rtc;

// Biến lưu giá trị NPK
int nitrogenValue = 0;
int phosphorusValue = 0;
int potassiumValue = 0;

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

// --- Hàm đọc giá trị từ cảm biến NPK qua Modbus RTU ---
int readNPKValue(const byte* request, int requestLength) {
  // Chuyển MAX485 sang chế độ truyền (Transmit)
  digitalWrite(NPK_DE_RE_PIN, HIGH);
  delay(10);
  
  // Gửi Modbus request frame
  NPKSerial.write(request, requestLength);
  NPKSerial.flush(); // Đợi gửi xong
  
  // Chuyển MAX485 sang chế độ nhận (Receive)
  digitalWrite(NPK_DE_RE_PIN, LOW);
  delay(10);
  
  // Đợi response từ cảm biến (timeout 1000ms)
  unsigned long startTime = millis();
  while (NPKSerial.available() < 7 && (millis() - startTime) < 1000) {
    delay(1);
  }
  
  // Đọc response
  if (NPKSerial.available() >= 7) {
    byte response[7];
    for (int i = 0; i < 7; i++) {
      response[i] = NPKSerial.read();
    }
    
    // Response format: [Addr][Func][ByteCount][DataHigh][DataLow][CRC_L][CRC_H]
    // Giá trị = DataHigh << 8 | DataLow
    int value = (response[3] << 8) | response[4];
    return value;
  }
  
  // Xóa buffer nếu có dữ liệu thừa
  while (NPKSerial.available()) {
    NPKSerial.read();
  }
  
  Serial.println("NPK Sensor: Timeout - Khong nhan duoc response");
  return -1; // Trả về -1 nếu lỗi
}

void readAllNPK() {
  int n = readNPKValue(nitrogenRequest, sizeof(nitrogenRequest));
  delay(100);
  int p = readNPKValue(phosphorusRequest, sizeof(phosphorusRequest));
  delay(100);
  int k = readNPKValue(potassiumRequest, sizeof(potassiumRequest));
  
  if (n >= 0) nitrogenValue = n;
  if (p >= 0) phosphorusValue = p;
  if (k >= 0) potassiumValue = k;
  
  Serial.print("NPK -> N: "); Serial.print(nitrogenValue);
  Serial.print(" mg/kg, P: "); Serial.print(phosphorusValue);
  Serial.print(" mg/kg, K: "); Serial.print(potassiumValue);
  Serial.println(" mg/kg");
}

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);
  
  pinMode(PUMP_PIN, OUTPUT);
  // Đảm bảo bơm bị tắt khi vừa cắm điện
  digitalWrite(PUMP_PIN, LOW); 

  // Khởi tạo RS485 cho cảm biến NPK
  pinMode(NPK_DE_RE_PIN, OUTPUT);
  digitalWrite(NPK_DE_RE_PIN, LOW); // Mặc định ở chế độ nhận
  NPKSerial.begin(9600, SERIAL_8N1, NPK_RX_PIN, NPK_TX_PIN);
  Serial.println("NPK Sensor RS485 initialized (UART2, GPIO16/17)");

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
    int soilRaw = analogRead(SOIL_PIN);
    
    int soilPercent = map(soilRaw, 4095, 1500, 0, 100);
    soilPercent = constrain(soilPercent, 0, 100);

    // Đọc giá trị NPK từ cảm biến RS485
    readAllNPK();

    String payload = "{";
    payload += "\"time\":\"" + String(timestamp) + "\",";
    payload += "\"temp\":" + String(temp, 1) + ",";
    payload += "\"hum\":" + String(hum, 1) + ",";
    payload += "\"lux\":" + String(lux, 1) + ",";
    payload += "\"soil\":" + String(soilPercent) + ",";
    payload += "\"nitrogen\":" + String(nitrogenValue) + ",";
    payload += "\"phosphorus\":" + String(phosphorusValue) + ",";
    payload += "\"potassium\":" + String(potassiumValue);
    payload += "}";

    client.publish(mqtt_topic_pub, payload.c_str());
    Serial.println("Sent: " + payload);
  }
}
