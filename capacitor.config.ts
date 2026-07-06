import type { CapacitorConfig } from "@capacitor/cli";

// ВАЖНО: сюда впиши свой рабочий адрес сайта с Vercel.
// Пример: "https://chilloutfm.vercel.app"
const serverUrl =
  process.env.CAPACITOR_SERVER_URL ||
  "https://chilloutfm.vercel.app";

const config: CapacitorConfig = {
  appId: "fm.chillout.radio",
  appName: "ChilloutFM",
  webDir: "dist",
  server: {
    url: serverUrl,
    androidScheme: "https",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
