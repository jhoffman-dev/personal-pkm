const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");
const { fork } = require("node:child_process");

const rendererUrl = process.env.ELECTRON_RENDERER_URL;
const aiServerPort = process.env.PKM_AI_SERVER_PORT || "11435";
const aiServerEntry = path.join(__dirname, "..", "backend", "server.cjs");

/** @type {import("node:child_process").ChildProcess | null} */
let aiServerProcess = null;

function ensureAiServerRunning() {
  if (aiServerProcess && !aiServerProcess.killed) {
    return;
  }

  aiServerProcess = fork(aiServerEntry, {
    env: {
      ...process.env,
      PKM_AI_SERVER_PORT: aiServerPort,
    },
    stdio: "inherit",
  });

  aiServerProcess.on("exit", () => {
    aiServerProcess = null;
  });
}

function stopAiServer() {
  if (!aiServerProcess || aiServerProcess.killed) {
    return;
  }

  aiServerProcess.kill();
  aiServerProcess = null;
}

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#111827",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      if (url === "about:blank") {
        return {
          action: "allow",
          overrideBrowserWindowOptions: {
            width: 500,
            height: 700,
            autoHideMenuBar: true,
            webPreferences: {
              contextIsolation: true,
              nodeIntegration: false,
              sandbox: true,
            },
          },
        };
      }

      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();

      const isFirebaseOrGoogleAuthWindow =
        hostname === "accounts.google.com" ||
        hostname.endsWith(".google.com") ||
        hostname.endsWith(".googleusercontent.com") ||
        hostname.endsWith(".firebaseapp.com") ||
        hostname.endsWith(".web.app") ||
        parsed.pathname.includes("/__/auth/") ||
        parsed.pathname.includes("/o/oauth2/");

      if (isFirebaseOrGoogleAuthWindow) {
        return {
          action: "allow",
          overrideBrowserWindowOptions: {
            width: 500,
            height: 700,
            autoHideMenuBar: true,
            webPreferences: {
              contextIsolation: true,
              nodeIntegration: false,
              sandbox: true,
            },
          },
        };
      }
    } catch {
      // fall through to deny + external open
    }

    if (url.includes("/__/auth/") || url.includes("accounts.google.com")) {
      return { action: "deny" };
    }

    shell.openExternal(url);
    return { action: "deny" };
  });

  if (rendererUrl) {
    mainWindow.loadURL(rendererUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  ensureAiServerRunning();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  stopAiServer();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  stopAiServer();
});
