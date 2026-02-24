const { contextBridge } = require("electron");

const aiPort = process.env.PKM_AI_SERVER_PORT || "11435";

contextBridge.exposeInMainWorld("pkmDesktop", {
  aiBaseUrl: `http://127.0.0.1:${aiPort}`,
  platform: process.platform,
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    node: process.versions.node,
  },
});
