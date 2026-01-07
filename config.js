// Functions 基础地址（/Hello 已不再使用）
export const API_BASE = "https://cnd-func-api-001-eydchjh5bphhfha0.francecentral-01.azurewebsites.net/api";

// Logic Apps 入口（与你现有保持一致）
export const LA = {
  create: "https://prod-24.francecentral.logic.azure.com:443/workflows/8584f4c7b9424f0fa66ca237603102c1/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=XBpGuErm3V6BzRFK9M0aiYI-qCwamDRfoWGmXM3S8lI",
  list:   "https://prod-30.francecentral.logic.azure.com:443/workflows/4d01104b3b644a16a40c7ccb42425549/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=UpSZD0VGYtJ8QNJTij6g6vrIDRqSCVsu94Xos9KddOg",
  get:    "https://prod-17.francecentral.logic.azure.com:443/workflows/3c56524b64f44d33aae02eec8d20bfb7/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=5GmBHcBHIMCB0yuGSPZsZjQIu-SyVjmmRz8OjlfwnlU",
  update: "https://prod-19.francecentral.logic.azure.com:443/workflows/5e14bdc22bc24402a3c84932e797587b/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=bvq2_O8Br_H8OqwxfZBkA8W0hHpw2jFXD2h2VLpn_Rs",
  del:    "https://prod-06.francecentral.logic.azure.com:443/workflows/48007b182a6c4012876745408149ff32/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=27BwFT5_a0NgOXfnGqEK6xdRpn-AnDOjNwsxYyGcg_g"
};

// Functions 路由（仅保留上传）
export const URLS = {
  upload: `${API_BASE}/UploadMedia`
};
