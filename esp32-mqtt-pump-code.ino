#define MQTT_MAX_PACKET_SIZE 1024 // Mở rộng bộ đệm nhận gói tin bắt tay TLS mã hóa
#include <Wire.h>
#include <SPI.h>
#include <SD.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <BH1750.h>
#include "RTClib.h"
#include <WiFi.h>
#include <WiFiClientSecure.h> 
#include <PubSubClient.h>     
#include <ArduinoJson.h>
#include <time.h>             // Thư viện xử lý thời gian tiêu chuẩn C
#include <esp_task_wdt.h>     // Thư viện Watchdog Timer chống treo cứng phần cứng

#define WDT_TIMEOUT 45        // Tăng lên 45 giây để thoải mái thời gian đợi kết nối/Modbus

// --- CẤU HÌNH WI-FI ---
const char* ssid = "Quynh Trang";
const char* password = "0987198612";

// --- CẤU HÌNH MQTTS HIVEMQ (CỔNG BẢO MẬT 8883) ---
const char* mqtt_server = "3130605c7a334c9ea10c3090a18418b0.s1.eu.hivemq.cloud"; 
const int mqtt_port = 8883;                                  
const char* mqtt_user = "daonhattan";                  
const char* mqtt_pass = "Qwe12345";                  
const char* mqtt_topic = "api/sensor-data";                  
const char* pump_cmd_topic = "bkhn/thang/pump/control";


// --- CHỨNG CHỈ CA ROOT LETS ENCRYPT (ISRG ROOT X1) CỦA HIVEMQ ---
const char* CA_CERTIFICATE = 
"-----BEGIN CERTIFICATE-----\n"
"MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw\n"
"TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh\n"
"cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4\n"
"WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu\n"
"ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY\n"
"MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc\n"
"h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+\n"
"0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U\n"
"A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW\n"
"T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH\n"
"B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC\n"
"B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv\n"
"KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn\n"
"OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn\n"
"jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw\n"
"qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI\n"
"rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV\n"
"HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq\n"
"hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL\n"
"ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ\n"
"3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK\n"
"NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5\n"
"ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur\n"
"TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC\n"
"jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc\n"
"oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq\n"
"4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA\n"
"mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d\n"
"emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=\n"
"-----END CERTIFICATE-----\n";


#define SOIL_MOISTURE_PIN 34
#define RELAY_PIN         26
#define SD_CS_PIN         5

HardwareSerial ModbusSerial(2); 

Adafruit_BME280 bme;
BH1750 lightMeter;
RTC_DS3231 rtc;

WiFiClientSecure espClient;
PubSubClient mqttClient(espClient);

const byte npkRequestFrame[] = {0x01, 0x03, 0x00, 0x1E, 0x00, 0x03, 0x65, 0xCD};
byte npkResponseBuffer[11];

// Thiết lập định thời gửi tin: 15 phút (900000 ms)
unsigned long previousMillis = -900000;  
const unsigned long interval = 900000;   

bool sdCardReady = false;
unsigned long lastMqttRetryAttempt = 0; // Quản lý thời gian thử lại MQTT phi tuần tự

void connectWiFi() {
  Serial.print("Đang kết nối Wi-Fi lần đầu...");
  WiFi.begin(ssid, password);
  
  int timeout = 0;
  while (WiFi.status() != WL_CONNECTED && timeout < 20) {
    delay(500);
    Serial.print(".");
    timeout++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nĐã kết nối Wi-Fi thành công!");
  } else {
    Serial.println("\nKhông có Wi-Fi lúc khởi động! Hệ thống chạy Offline.");
  }
}

// Chuyển sang cơ chế Non-blocking (Không chặn)
bool reconnectMqtt() {
  if (mqttClient.connected()) return true;
  if (WiFi.status() != WL_CONNECTED) return false; 

  unsigned long now = millis();
  // Chỉ thử kết nối lại sau mỗi 5 giây, không chặn cứng luồng xử lý
  if (now - lastMqttRetryAttempt > 5000) {
    lastMqttRetryAttempt = now;
    
    Serial.print("Đang bắt tay mã hóa TLS với HiveMQ Cloud (Non-blocking)...");
    String clientId = "ESP32_PeachNode_" + String(random(0, 1000));
    
    if (mqttClient.connect(clientId.c_str(), mqtt_user, mqtt_pass)) {
      Serial.println("Kết nối bảo mật THÀNH CÔNG!");
      mqttClient.subscribe(pump_cmd_topic);
      Serial.println("Đã Subscribe topic điều khiển bơm!");
      return true;
    } else {
      Serial.printf("Thất bại, rc=%d. Sẽ thử lại ở chu kỳ sau.\n", mqttClient.state());
    }
  }
  return false;
}

uint32_t getAvailableTimestamp() {
  if (WiFi.status() == WL_CONNECTED) {
    time_t ntpTime = time(nullptr);
    if (ntpTime > 1735689600) { 
      return (uint32_t)ntpTime; 
    }
  }
  DateTime rtcNow = rtc.now();
  return rtcNow.unixtime();
}

String buildJsonString(uint32_t epochTime, float t, float h, float lx, int soil, int n, int p, int k) {
  StaticJsonDocument<512> doc; 
  doc["device_id"] = "ESP32_Peach_Node";
  doc["timestamp"] = epochTime; 
  doc["temp"] = t;
  doc["hum"] = h;
  doc["lux"] = lx;
  doc["soil"] = (float)soil; 
  doc["nitrogen"] = (float)n;
  doc["phosphorus"] = (float)p;
  doc["potassium"] = (float)k;
  
  String output;
  serializeJson(doc, output);
  return output;
}

void saveDataToSD(uint32_t epochTime, float t, float h, float lx, int soil, int n, int p, int k) {
  if (!sdCardReady) return;
  
  File dataFile = SD.open("/offline_data.csv", FILE_WRITE);
  if (dataFile) {
    dataFile.printf("%u,%.2f,%.2f,%.2f,%d,%d,%d,%d\n", 
                    epochTime, t, h, lx, soil, n, p, k);
    dataFile.close();
    Serial.println("[SD] -> Đã lưu gói dữ liệu đệm an toàn vào thẻ nhớ.");
  } else {
    Serial.println("[SD] -> Thất bại! Không mở được file đệm để lưu.");
  }
}

// Tối ưu hóa hàm đồng bộ: giải phóng bộ nhớ lập tức và khống chế số lượng gói tin gửi để chống sụp nguồn
void syncOfflineData() {
  if (!sdCardReady) return;
  if (WiFi.status() != WL_CONNECTED || !mqttClient.connected()) return;
  if (!SD.exists("/offline_data.csv")) return;
  
  Serial.println("\n[SD] Phát hiện vết dữ liệu offline cũ! Tiến hành đồng bộ bù qua MQTTS...");
  File dataFile = SD.open("/offline_data.csv", FILE_READ);
  if (!dataFile) return;
  
  // Tạo file tạm để chứa các dòng chưa gửi được (nếu tiến trình đồng bộ bị ngắt quãng giữa chừng)
  File tempFile = SD.open("/temp_data.csv", FILE_WRITE);
  if (!tempFile) {
    dataFile.close();
    return;
  }
  
  int syncedCount = 0;
  const int maxSyncPerCycle = 10; // Giới hạn chỉ gửi tối đa 10 gói tin mỗi lần để tránh sụt nguồn & tràn RAM
  
  while (dataFile.available()) {
    esp_task_wdt_reset();
    
    // Đọc dòng bằng scope cục bộ để tự giải phóng String ngay lập tức ra khỏi bộ nhớ Heap
    {
      String line = dataFile.readStringUntil('\n');
      line.trim();
      if (line.length() == 0) continue;
      
      bool currentLineSynced = false;
      
      if (syncedCount < maxSyncPerCycle) {
        String tokens[8];
        int tokenCount = 0;
        int lastIdx = 0;
        
        for (int i = 0; i < line.length(); i++) {
          if (line.charAt(i) == ',') {
            tokens[tokenCount++] = line.substring(lastIdx, i);
            lastIdx = i + 1;
            if (tokenCount >= 7) break;
          }
        }
        tokens[tokenCount++] = line.substring(lastIdx); 
        
        if (tokenCount == 8) {
          uint32_t t_time = strtoul(tokens[0].c_str(), NULL, 10);
          float t_temp  = tokens[1].toFloat();
          float t_hum   = tokens[2].toFloat();
          float t_lux   = tokens[3].toFloat();
          int t_soil    = tokens[4].toInt();
          int t_n       = tokens[5].toInt();
          int t_p       = tokens[6].toInt();
          int t_k       = tokens[7].toInt();
          
          String jsonPayload = buildJsonString(t_time, t_temp, t_hum, t_lux, t_soil, t_n, t_p, t_k);
          
          Serial.printf("[Tái đồng bộ MQTTS] Đang đẩy lại gói tin mốc: %u\n", t_time);
          if (mqttClient.publish(mqtt_topic, jsonPayload.c_str())) {
            currentLineSynced = true;
            syncedCount++;
            delay(500); // Tăng giãn cách lên 500ms để giảm tải dòng tiêu thụ tức thời của module RF, tránh sụt áp
          }
        }
      }
      
      // Nếu dòng này chưa được gửi (do quá giới hạn cycle hoặc lỗi gửi), lưu tạm vào file temp
      if (!currentLineSynced) {
        tempFile.println(line);
      }
    }
  }
  
  dataFile.close();
  tempFile.close();
  
  // Dọn dẹp file bằng cách đổi tên file tạm thành file chính thức (Rename chỉ tốn 5-10ms)
  SD.remove("/offline_data.csv");
  if (SD.exists("/temp_data.csv")) {
    if (SD.rename("/temp_data.csv", "/offline_data.csv")) {
      Serial.println("[SD] -> Đã cập nhật file dữ liệu offline thành công.");
    } else {
      Serial.println("[SD] -> Lỗi đổi tên file tạm!");
    }
  }
  
  if (syncedCount > 0) {
    Serial.printf("[SD] -> Đã đồng bộ thành công %d gói tin cũ trong chu kỳ này.\n", syncedCount);
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  if (String(topic) == String(pump_cmd_topic)) {
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, message);
    if (!error) {
      String state = doc["state"];
      if (state == "ON") {
        digitalWrite(RELAY_PIN, HIGH); // Relay Active-HIGH (Bật bơm)
        Serial.println("[MQTT] -> Nhận lệnh BẬT BƠM từ Web");
      } else if (state == "OFF") {
        digitalWrite(RELAY_PIN, LOW); // Relay Active-HIGH (Tắt bơm)
        Serial.println("[MQTT] -> Nhận lệnh TẮT BƠM từ Web");
      }
    } else {
      Serial.println("[MQTT] -> Lỗi phân tích JSON lệnh điều khiển bơm!");
    }
  }
}

void setup() {
  Serial.begin(115200);
  ModbusSerial.begin(9600, SERIAL_8N1, 16, 17); 
  
  digitalWrite(RELAY_PIN, LOW); // Đảm bảo rơ-le tắt khi khởi động (Active-HIGH)
  pinMode(RELAY_PIN, OUTPUT);

  WiFi.setAutoReconnect(true); 
  WiFi.persistent(true);       
  
  connectWiFi();

  Wire.begin(21, 22);
  if (!rtc.begin()) {
    Serial.println("Không tìm thấy module RTC!");
  }
  
  if (rtc.lostPower()) {
    Serial.println("RTC bị mất nguồn đệm! Tiến hành nạp lại thời gian biên dịch hệ thống...");
    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Phát hiện Wi-Fi! Đang đồng bộ giờ chuẩn Google NTP vào hệ thống lõi TLS...");
    configTime(25200, 0, "time.google.com", "pool.ntp.org");
    
    struct tm timeinfo;
    if (getLocalTime(&timeinfo, 5000)) { 
      Serial.println("-> Đồng bộ giờ nội bộ ESP32 từ NTP thành công! Sẵn sàng bắt tay TLS.");
    } else {
      Serial.println("-> Lỗi NTP! Tự động lấy mốc giờ RTC nạp vào lõi mạng dự phòng...");
      struct timeval tv;
      tv.tv_sec = rtc.now().unixtime();
      tv.tv_usec = 0;
      settimeofday(&tv, NULL);
    }
  } else {
    Serial.println("Hệ thống Offline! Nạp mốc giờ RTC vật lý vào hệ thống lõi mạng.");
    struct timeval tv;
    tv.tv_sec = rtc.now().unixtime();
    tv.tv_usec = 0;
    settimeofday(&tv, NULL);
  }

  espClient.setCACert(CA_CERTIFICATE); 
  espClient.setTimeout(15); 
  mqttClient.setServer(mqtt_server, mqtt_port);
  mqttClient.setCallback(mqttCallback);

  Serial.print("Đang khởi tạo thẻ SD...");
  if (SD.begin(SD_CS_PIN)) {
    Serial.println("Thành công!");
    sdCardReady = true;
  } else {
    Serial.println("Thất bại!");
    sdCardReady = false;
  }

  if (!bme.begin(0x76, &Wire)) Serial.println("Không tìm thấy BME280!");
  if (!lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) Serial.println("Không tìm thấy BH1750!");

  // --- SỬA LỖI ĐỊNH DẠNG WDT CHO ESP32 HARDWARE CORE 3.X.X ---
  esp_task_wdt_config_t wdt_config = {
      .timeout_ms = WDT_TIMEOUT * 1000, 
      .idle_core_mask = 0,             
      .trigger_panic = true            
  };
  esp_task_wdt_init(&wdt_config);      
  esp_task_wdt_add(NULL);              
  Serial.println("-> [WDT] Hệ thống Watchdog Core v3 đã kích hoạt thành công.");
}

void loop() {
  esp_task_wdt_reset(); // Cho chó ăn

  // Chỉ thử kết nối lại nếu có Wi-Fi và đang mất kết nối MQTT
  if (WiFi.status() == WL_CONNECTED && !mqttClient.connected()) {
    reconnectMqtt();
  }

  // Lọc nhiễu bằng cách lấy trung bình 10 lần đọc
  long sumMoisture = 0;
  for (int i = 0; i < 10; i++) {
    sumMoisture += analogRead(SOIL_MOISTURE_PIN);
    delay(2);
  }
  int soilMoistureRaw = sumMoisture / 10;

  // Chỉ chạy logic Bơm Tự Động Nội Bộ khi MẤT KẾT NỐI MẠNG (Offline Fallback)
  // Nếu có mạng, việc điều khiển (dù thủ công hay tự động) đều do Web/Backend quyết định!
  if (!mqttClient.connected()) {
    // Cơ chế Hysteresis (ngưỡng trễ) chống nháy relay
    if (soilMoistureRaw > 2600) { // Ngưỡng bật bơm (đất khô)
      digitalWrite(RELAY_PIN, HIGH);  // Module rơ le của bạn là Active-HIGH (HIGH = Bật)
    } else if (soilMoistureRaw < 2400) { // Ngưỡng tắt bơm (đất đã ẩm)
      digitalWrite(RELAY_PIN, LOW); // LOW = Tắt rơ le
    }
  }

  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis; 

    Serial.println("\n--- CHU KỲ ĐO ĐẠC & GỬI DỮ LIỆU LÊN CLOUD MQTTS (15 PHÚT/LẦN) ---");
    uint32_t activeTimestamp = getAvailableTimestamp(); 

    float temp = bme.readTemperature();
    float hum = bme.readHumidity();
    float lux = lightMeter.readLightLevel();

    // ---- KHỐI ĐỌC CẢM BIẾN NPK MODBUS (AN TOÀN KHI KHÔNG CẮM CẢM BIẾN) ----
    int nitrogen = 0, phosphorus = 0, potassium = 0;
    
    while (ModbusSerial.available() > 0) {
      ModbusSerial.read(); 
    }

    ModbusSerial.write(npkRequestFrame, sizeof(npkRequestFrame));
    ModbusSerial.flush();

    unsigned long startWait = millis();
    // Chờ phản hồi phần cứng, kết hợp cho WDT ăn liên tục để tránh sập nguồn giữa chừng
    while (ModbusSerial.available() < 11 && (millis() - startWait < 1000)) {
      esp_task_wdt_reset();
      delay(10); 
    }

    if (ModbusSerial.available() >= 11) {
      for (int i = 0; i < 11; i++) {
        npkResponseBuffer[i] = ModbusSerial.read();
      }
      if (npkResponseBuffer[0] == 0x01) {
        nitrogen   = (npkResponseBuffer[3] << 8) | npkResponseBuffer[4];
        phosphorus = (npkResponseBuffer[5] << 8) | npkResponseBuffer[6];
        potassium  = (npkResponseBuffer[7] << 8) | npkResponseBuffer[8];
        Serial.printf("-> Đọc NPK thành công: N=%d, P=%d, K=%d\n", nitrogen, phosphorus, potassium);
      }
    } else {
      // Khi không cắm cảm biến NPK -> Luồng code rơi vào đây, in thông báo nhưng KHÔNG treo mạch
      Serial.println("-> Cảnh báo: Không cắm cảm biến NPK hoặc cảm biến phản hồi Timeout. Gán giá trị mặc định = 0.");
    }
    // --------------------------------------------------------------------------

    String currentPayload = buildJsonString(activeTimestamp, temp, hum, lux, soilMoistureRaw, nitrogen, phosphorus, potassium);

    // Kiểm tra kết nối trước khi publish
    if (WiFi.status() == WL_CONNECTED && mqttClient.connected()) {
      syncOfflineData(); 
      
      Serial.printf("-> Có mạng: Đang publish gói tin Real-time. Timestamp: %u\n", activeTimestamp);
      if (mqttClient.publish(mqtt_topic, currentPayload.c_str())) {
        Serial.println("-> Publish lên HiveMQ thành công!");
      } else {
        Serial.println("-> Lỗi kết nối tầng ứng dụng MQTT! Chuyển hướng lưu SD dự phòng.");
        saveDataToSD(activeTimestamp, temp, hum, lux, soilMoistureRaw, nitrogen, phosphorus, potassium);
      }
    } else {
      Serial.printf("-> Mất mạng/MQTT: Tiến hành lưu dữ liệu tạm vào thẻ SD. Timestamp: %u\n", activeTimestamp);
      saveDataToSD(activeTimestamp, temp, hum, lux, soilMoistureRaw, nitrogen, phosphorus, potassium);
    }
  } 

  // Chỉ chạy loop xử lý nhận tin nhắn nếu MQTT thực sự đã được kết nối
  if (mqttClient.connected()) {
    mqttClient.loop(); 
  }
  delay(10); 
}
