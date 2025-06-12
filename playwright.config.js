export default {
  webServer: {
    command: "npx http-server -p 8000 -c-1",
    port: 8000,
    reuseExistingServer: true,
    timeout: 10000
  },
  testDir: "tests",
  use: { baseURL: "http://127.0.0.1:8000", headless: true }
};
