// The full esm-bundler build (not the runtime-only default) is required because
// the app below uses an inline `template` string, which needs Vue's runtime
// template compiler. Without it the app never renders and the page is stuck on
// the "Loading NRL OTA…" fallback.
import { createApp, computed, ref, watch } from "vue/dist/vue.esm-bundler.js";
import "./style.css";

// The deployed OTA API already owns its /api/v1 routes; static files are
// served separately by the web server.
const apiURL = (path) => path;

// Board catalog and feature matrix are served by the API (/api/v1/catalog).

const messages = {
  zh: {
    title: "NRL OTA 固件中心",
    subtitle: "查看各板卡的固件版本与更新日志。管理员登录后可发布固件并查看联网设备状态。",
    language: "语言",
    chinese: "中文",
    english: "English",
    brandName: "NRL OTA",
    navHome: "首页",
    navFirmware: "固件下载",
    navFlash: "网页刷机",
    navDevices: "设备管理",
    navPublish: "发布固件",
    navBoards: "板卡管理",
    adminLogin: "管理登录",
    loginTitle: "管理员登录",
    username: "用户名",
    password: "密码",
    welcome: "{user}",
    boardsHeading: "支持的板卡",
    boardSearch: "搜索板卡名称、型号或主控…",
    boardCount: "共 {count} 个板卡类型",
    chip: "主控",
    features: "特性",
    featureMatrixHeading: "功能支持对照",
    featureMatrixHint: "✓ 支持　△ 部分支持或受板卡外设限制　— 不支持",
    function: "功能",
    historyHeading: "固件历史",
    latest: "最新",
    version: "版本",
    channel: "渠道",
    stable: "稳定版",
    beta: "测试版",
    size: "大小",
    notes: "更新日志",
    noNotes: "（无更新说明）",
    releasedAt: "发布时间",
    download: "下载",
    noReleases: "该板卡暂无已发布固件。",
    flashHeading: "USB 网页刷机",
    flashIntro:
      "用 USB 数据线连接设备，在 Chrome 或 Edge 浏览器里刷写完整固件（含引导程序与分区表）。需要 HTTPS 或本机访问。支持 ESP32-S3 / S31 板卡。",
    flashReady: "支持 USB 网页刷机",
    flashButton: "USB 刷机",
    flashUnsupported: "当前浏览器不支持 Web Serial，请使用 Chrome 或 Edge。",
    flashNeedsHttps:
      "当前页面使用非安全的 HTTP 地址。Web Serial 要求使用 HTTPS（localhost 除外），请通过配置了 HTTPS 的服务器地址访问。",
    flashNotAllowed: "Web Serial 权限被阻止，请检查浏览器的网站权限或管理员策略。",
    flashSerialOnly:
      "该板卡暂不支持网页刷机，请使用串口烧录（scripts/build.py <board> flash）。",
    flashUnavailable: "该板卡暂未上传可刷写的固件包。",
    flashTip: "若无法识别设备，请按住 BOOT 再插入 USB 后重试。",
    navSerial: "串口调试",
    serialHeading: "串口调试终端",
    serialIntro:
      "连接已运行的板卡后，可直接查看调试输出并输入 AT 指令。日志显示区与命令输入行独立，输出不会打断正在编辑的命令。",
    serialBoard: "板卡型号",
    serialConnect: "连接串口",
    serialDisconnect: "断开连接",
    serialReady: "已连接，输入 AT 查看命令列表。",
    serialUnsupported: "当前浏览器不支持 Web Serial，请使用 Chrome 或 Edge。",
    serialConnectFailed: "串口连接失败：{error}",
    serialWriteFailed: "命令发送失败：{error}",
    loadFailed: "加载失败：{error}",
    adminArea: "管理员",
    adminHint: "输入管理员用户名和密码，登录后可查看设备状态并发布固件。",
    login: "登录",
    logout: "退出登录",
    loginFailed: "登录失败：{error}",
    loggedIn: "已登录",
    dashboardTitle: "设备管理",
    statTotal: "设备总数",
    statOnline: "在线设备",
    statBoards: "板卡型号",
    statOutdated: "待升级",
    onlineHint: "5 分钟内有上报即视为在线",
    lastRefresh: "上次更新 {time}",
    exportCSV: "导出 CSV",
    sha256: "SHA256",
    copy: "复制",
    copied: "已复制",
    copyLink: "复制链接",
    loading: "加载中…",
    themeToLight: "切换浅色",
    themeToDark: "切换深色",
    downloadLatest: "下载最新",
    currentLatest: "当前最新：{version}",
    versionRequired: "请填写版本号并选择固件文件",
    publishConfirm: "确认发布 {board} 的 {version}（{channel}）？",
    serialClear: "清空",
    serialCopyLog: "复制日志",
    archive: "下架",
    restore: "恢复",
    archived: "已归档",
    actions: "操作",
    archiveConfirm: "确认下架 {board} 的 {version}？下架后公开页面和设备都不再可见（文件保留，可随时恢复）。",
    restoreConfirm: "确认恢复 {board} 的 {version} 为公开可见？",
    deleteRelease: "删除",
    deleteConfirm: "确认删除 {board} 的 {version}（{channel}）？数据库记录和固件文件都会被删除，无法恢复！",
    upToDate: "最新",
    updateAvailable: "可升级",
    deviceStatusHeading: "设备状态",
    searchPlaceholder: "搜索 设备ID / 板卡 / 呼号 / IP…",
    filterAll: "全部",
    noMatch: "没有匹配的设备。",
    pageInfo: "第 {from}–{to} 条，共 {total} 条",
    prevPage: "上一页",
    nextPage: "下一页",
    pageOf: "{page} / {count}",
    refresh: "刷新",
    noDevices: "尚无设备上报。",
    deviceId: "设备 ID",
    board: "板卡",
    firmware: "固件",
    callsign: "NRL 呼号",
    ssid: "SSID",
    ipAddress: "IP 地址",
    lastSeen: "最后在线",
    deleteDevice: "删除",
    deleteDeviceConfirm: "确认删除设备 {id}？删除后该设备记录将不可恢复！",
    publishHeading: "发布固件",
    boardType: "板卡类型",
    firmwareVersion: "版本",
    firmwareFile: "固件文件",
    releaseNotes: "更新日志",
    publish: "发布固件",
    publishing: "正在上传固件…",
    published: "已发布 {version}（{size} 字节）",
    uploadFailed: "发布失败：{error}",
    boardManagerTitle: "板卡类型与功能管理",
    boardManagerHint:
      "创建板卡、上传图片、编辑中英文介绍，并配置功能对照。草稿不会出现在公开页面。",
    newBoard: "新建板卡",
    boardId: "板卡 ID（保存后不可修改）",
    nameZH: "中文名称",
    nameEN: "英文名称",
    taglineZH: "中文短介绍",
    taglineEN: "英文短介绍",
    descriptionZH: "中文详细说明",
    descriptionEN: "英文详细说明",
    chipLabel: "主控显示名称",
    webFlashFamily: "网页刷机芯片类型（不支持则留空）",
    displayOrder: "显示顺序",
    boardStatus: "发布状态",
    draft: "草稿",
    publishedStatus: "已发布",
    archived: "已归档",
    highlightsZH: "中文板卡要点（每行一项）",
    highlightsEN: "英文板卡要点（每行一项）",
    saveBoard: "保存板卡资料",
    boardSaved: "板卡资料已保存",
    boardImage: "板卡图片（JPEG / PNG / WebP，最大 5 MB）",
    uploadImage: "上传图片",
    imageUploaded: "图片已上传",
    featureAssignments: "板卡功能对照",
    saveFeatures: "保存功能配置",
    featuresSaved: "功能配置已保存",
    featureYes: "支持",
    featurePartial: "部分支持",
    featureNo: "不支持",
    addFeature: "添加功能项",
    featureKey: "功能键（小写英文）",
    featureLabelZH: "功能中文名称",
    featureLabelEN: "功能英文名称",
    featureDescriptionZH: "功能中文说明",
    featureDescriptionEN: "功能英文说明",
    editFeature: "编辑功能项",
    newFeature: "新功能项",
    partialNoteZH: "中文限制说明",
    partialNoteEN: "英文限制说明",
    featureAdded: "功能项已添加",
    aiImport: "AI / JSON 导入",
    aiImportHint:
      "粘贴符合管理 API 格式的 JSON，一次提交板卡、功能定义和功能状态。图片需保存后单独上传。",
    importCatalog: "导入并保存",
    catalogImported: "目录资料已导入",
    manageFailed: "保存失败：{error}",
    unknownError: "请求失败",
  },
  en: {
    title: "NRL OTA Firmware Center",
    subtitle:
      "Browse firmware versions and changelogs for every board. Administrators can publish firmware and view connected-device status after logging in.",
    language: "Language",
    chinese: "中文",
    english: "English",
    brandName: "NRL OTA",
    navHome: "Home",
    navFirmware: "Firmware",
    navFlash: "USB Flash",
    navDevices: "Devices",
    navPublish: "Publish",
    navBoards: "Boards",
    adminLogin: "Admin login",
    loginTitle: "Administrator login",
    username: "Username",
    password: "Password",
    welcome: "{user}",
    boardsHeading: "Supported boards",
    boardSearch: "Search board name, ID, or SoC…",
    boardCount: "{count} board types",
    chip: "SoC",
    features: "Features",
    featureMatrixHeading: "Feature comparison",
    featureMatrixHint: "✓ Supported　△ Limited by board hardware　— Unavailable",
    function: "Function",
    historyHeading: "Firmware history",
    latest: "Latest",
    version: "Version",
    channel: "Channel",
    stable: "Stable",
    beta: "Beta",
    size: "Size",
    notes: "Changelog",
    noNotes: "(no release notes)",
    releasedAt: "Released",
    download: "Download",
    noReleases: "No firmware has been published for this board yet.",
    flashHeading: "USB web flashing",
    flashIntro:
      "Connect the device over USB and flash the full firmware (bootloader and partition table included) from Chrome or Edge. Requires HTTPS or localhost. ESP32-S3 / S31 boards.",
    flashReady: "Web-flashable over USB",
    flashButton: "Flash via USB",
    flashUnsupported: "This browser does not support Web Serial. Use Chrome or Edge.",
    flashNeedsHttps:
      "This page is using an insecure HTTP address. Web Serial requires HTTPS (except on localhost). Open the site through its HTTPS address.",
    flashNotAllowed:
      "Web Serial permission was blocked. Check the site's browser permissions or administrator policy.",
    flashSerialOnly:
      "This board is not web-flashable. Use serial flashing (scripts/build.py <board> flash).",
    flashUnavailable: "No flashable firmware package has been staged for this board yet.",
    flashTip: "If the device is not detected, hold BOOT while plugging in USB, then retry.",
    navSerial: "Serial debug",
    serialHeading: "Serial debug terminal",
    serialIntro:
      "Connect a running board to view debug output and send AT commands. Output and command entry are separate, so incoming logs never interrupt typing.",
    serialBoard: "Board model",
    serialConnect: "Connect serial",
    serialDisconnect: "Disconnect",
    serialReady: "Connected. Type AT to list commands.",
    serialUnsupported: "This browser does not support Web Serial. Use Chrome or Edge.",
    serialConnectFailed: "Serial connection failed: {error}",
    serialWriteFailed: "Command send failed: {error}",
    loadFailed: "Load failed: {error}",
    adminArea: "Administrator",
    adminHint:
      "Sign in with the administrator username and password to view device status and publish firmware.",
    login: "Log in",
    logout: "Log out",
    loginFailed: "Login failed: {error}",
    loggedIn: "Logged in",
    dashboardTitle: "Device management",
    statTotal: "Total devices",
    statOnline: "Online",
    statBoards: "Board models",
    statOutdated: "Need update",
    onlineHint: "Reported within the last 5 minutes counts as online",
    lastRefresh: "Updated {time}",
    exportCSV: "Export CSV",
    sha256: "SHA256",
    copy: "Copy",
    copied: "Copied",
    copyLink: "Copy link",
    loading: "Loading…",
    themeToLight: "Light theme",
    themeToDark: "Dark theme",
    downloadLatest: "Download latest",
    currentLatest: "Current latest: {version}",
    versionRequired: "Enter a version and choose a firmware file",
    publishConfirm: "Publish {version} ({channel}) for {board}?",
    serialClear: "Clear",
    serialCopyLog: "Copy log",
    archive: "Archive",
    restore: "Restore",
    archived: "Archived",
    actions: "Actions",
    archiveConfirm:
      "Archive {version} for {board}? It disappears from the public page and devices (files are kept; restore anytime).",
    restoreConfirm: "Restore {version} for {board} to public visibility?",
    deleteRelease: "Delete",
    deleteConfirm:
      "Permanently delete {version} ({channel}) for {board}? The database record and firmware files are removed and cannot be recovered!",
    upToDate: "Up to date",
    updateAvailable: "Update available",
    deviceStatusHeading: "Device status",
    searchPlaceholder: "Search device ID / board / callsign / IP…",
    filterAll: "All",
    noMatch: "No devices match the filter.",
    pageInfo: "{from}–{to} of {total}",
    prevPage: "Prev",
    nextPage: "Next",
    pageOf: "{page} / {count}",
    refresh: "Refresh",
    noDevices: "No devices have reported yet.",
    deviceId: "Device ID",
    board: "Board",
    firmware: "Firmware",
    callsign: "NRL callsign",
    ssid: "SSID",
    ipAddress: "IP address",
    lastSeen: "Last seen",
    deleteDevice: "Delete",
    deleteDeviceConfirm: "Delete device {id}? This record will be permanently removed!",
    publishHeading: "Publish firmware",
    boardType: "Board type",
    firmwareVersion: "Version",
    firmwareFile: "Firmware file",
    releaseNotes: "Release notes",
    publish: "Publish firmware",
    publishing: "Uploading firmware…",
    published: "Published {version} ({size} bytes)",
    uploadFailed: "Publish failed: {error}",
    boardManagerTitle: "Board types and features",
    boardManagerHint:
      "Create boards, upload images, edit bilingual descriptions, and configure the comparison matrix. Drafts stay private.",
    newBoard: "New board",
    boardId: "Board ID (immutable after save)",
    nameZH: "Chinese name",
    nameEN: "English name",
    taglineZH: "Chinese tagline",
    taglineEN: "English tagline",
    descriptionZH: "Chinese description",
    descriptionEN: "English description",
    chipLabel: "SoC display label",
    webFlashFamily: "Web-flash chip family (blank if unsupported)",
    displayOrder: "Display order",
    boardStatus: "Status",
    draft: "Draft",
    publishedStatus: "Published",
    archived: "Archived",
    highlightsZH: "Chinese highlights (one per line)",
    highlightsEN: "English highlights (one per line)",
    saveBoard: "Save board",
    boardSaved: "Board saved",
    boardImage: "Board image (JPEG / PNG / WebP, max 5 MB)",
    uploadImage: "Upload image",
    imageUploaded: "Image uploaded",
    featureAssignments: "Board feature comparison",
    saveFeatures: "Save features",
    featuresSaved: "Feature assignments saved",
    featureYes: "Supported",
    featurePartial: "Partial",
    featureNo: "Unavailable",
    addFeature: "Add feature",
    featureKey: "Feature key (lowercase)",
    featureLabelZH: "Chinese feature label",
    featureLabelEN: "English feature label",
    featureDescriptionZH: "Chinese feature description",
    featureDescriptionEN: "English feature description",
    editFeature: "Edit feature",
    newFeature: "New feature",
    partialNoteZH: "Chinese limitation note",
    partialNoteEN: "English limitation note",
    featureAdded: "Feature added",
    aiImport: "AI / JSON import",
    aiImportHint:
      "Paste management API JSON to submit a board, feature definitions, and assignments together. Upload the image separately after saving.",
    importCatalog: "Import and save",
    catalogImported: "Catalog imported",
    manageFailed: "Save failed: {error}",
    unknownError: "Request failed",
  },
};

function savedLanguage() {
  const saved = localStorage.otaLanguage;
  if (saved === "zh" || saved === "en") return saved;
  return navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";
}

const app = createApp({
  setup() {
    const language = ref(savedLanguage());
    const view = ref("home");
    const session = ref(localStorage.otaSession || "");
    const sessionUser = ref(localStorage.otaUser || "");
    const authed = ref(false);
    const username = ref("");
    const password = ref("");
    const history = ref({}); // board id -> release[]
    const catalogBoards = ref([]);
    const catalogFeatures = ref([]);
    const devices = ref([]);
    const loadError = ref("");
    const boardSearch = ref("");
    const loginError = ref("");
    const secureContext = window.isSecureContext;
    const webSerialAvailable = "serial" in navigator;

    // Manual light/dark override. The dark "tech" theme is the default; the
    // choice is persisted and applied to <html data-theme>, which all CSS
    // theme rules key off. index.html applies it pre-paint to avoid a flash.
    const theme = ref(localStorage.otaTheme === "light" ? "light" : "dark");
    watch(
      theme,
      (value) => {
        localStorage.otaTheme = value;
        document.documentElement.dataset.theme = value;
      },
      { immediate: true },
    );
    const toggleTheme = () => {
      theme.value = theme.value === "dark" ? "light" : "dark";
    };

    // Serial debug terminal. Keep the log view and command entry as separate
    // DOM elements: ESP_LOG output can arrive at any time without moving or
    // corrupting what the user is currently typing.
    const serialBoard = ref("s31_korvo");
    const serialPort = ref(null);
    const serialConnected = ref(false);
    const serialOutput = ref("");
    const serialInput = ref("");
    const serialMessage = ref("");
    const serialOutputEl = ref(null);
    const serialPrompt = computed(() => `${boardName(serialBoard.value)}# `);
    let activeSerialReader = null;
    let serialReadTask = null;

    function appendSerialOutput(text) {
      serialOutput.value = (serialOutput.value + text).slice(-200000);
      setTimeout(() => {
        const output = serialOutputEl.value;
        if (output) output.scrollTop = output.scrollHeight;
      });
    }

    async function readSerial(port) {
      const reader = port.readable.getReader();
      const decoder = new TextDecoder();
      activeSerialReader = reader;
      try {
        while (serialConnected.value && serialPort.value === port) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) appendSerialOutput(decoder.decode(value, { stream: true }));
        }
        const tail = decoder.decode();
        if (tail) appendSerialOutput(tail);
      } catch (error) {
        if (serialConnected.value) {
          appendSerialOutput(`\r\n[serial read error: ${error.message}]\r\n`);
        }
      } finally {
        try {
          reader.releaseLock();
        } catch {
          // The port may already have been closed by the browser.
        }
        if (activeSerialReader === reader) activeSerialReader = null;
        if (serialPort.value === port) serialConnected.value = false;
      }
    }

    async function connectSerial() {
      if (!webSerialAvailable) {
        serialMessage.value = t("serialUnsupported");
        return;
      }
      serialMessage.value = "";
      try {
        const port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200, bufferSize: 8192 });
        serialPort.value = port;
        serialConnected.value = true;
        appendSerialOutput(`[${serialPrompt.value}${t("serialReady")}]\r\n`);
        serialReadTask = readSerial(port);
      } catch (error) {
        serialMessage.value = t("serialConnectFailed", { error: error.message });
      }
    }

    async function disconnectSerial() {
      const port = serialPort.value;
      serialConnected.value = false;
      try {
        await activeSerialReader?.cancel();
      } catch {
        // A disconnected device may reject cancellation.
      }
      try {
        await serialReadTask;
      } catch {
        // readSerial reports its own error in the terminal.
      }
      try {
        await port?.close();
      } catch {
        // The browser may already have closed the port.
      }
      if (serialPort.value === port) serialPort.value = null;
      serialReadTask = null;
    }

    // Sent commands are kept for the session so ArrowUp/ArrowDown can walk
    // back through them, like a real terminal.
    const serialHistoryList = ref([]);
    const serialHistoryIndex = ref(-1);

    async function sendSerialText(command) {
      if (!serialConnected.value || !serialPort.value || !command) return;
      appendSerialOutput(`${serialPrompt.value}${command}\r\n`);
      const writer = serialPort.value.writable.getWriter();
      try {
        await writer.write(new TextEncoder().encode(`${command}\r\n`));
      } catch (error) {
        serialMessage.value = t("serialWriteFailed", { error: error.message });
      } finally {
        writer.releaseLock();
      }
    }

    async function sendSerialCommand() {
      const command = serialInput.value.trim();
      if (!command) return;
      serialInput.value = "";
      if (serialHistoryList.value[serialHistoryList.value.length - 1] !== command)
        serialHistoryList.value.push(command);
      serialHistoryIndex.value = -1;
      await sendSerialText(command);
    }

    function serialHistoryNav(direction) {
      const list = serialHistoryList.value;
      if (!list.length) return;
      serialHistoryIndex.value =
        direction < 0
          ? Math.min(serialHistoryIndex.value + 1, list.length - 1)
          : Math.max(serialHistoryIndex.value - 1, -1);
      serialInput.value =
        serialHistoryIndex.value === -1 ? "" : list[list.length - 1 - serialHistoryIndex.value];
    }

    function openSerialDebug(boardId) {
      serialBoard.value = boardId;
      setView("serial");
    }

    // publish form
    const board = ref("s31_korvo");
    const version = ref("");
    const channel = ref("stable");
    const notes = ref("");
    const firmware = ref();
    const publishMessage = ref("");

    // Board catalog manager. The same API is intentionally usable by an AI
    // client with an administrator token; the page provides a JSON import box
    // for reviewing and submitting that structured result.
    const emptyBoard = () => ({
      id: "",
      name_zh: "",
      name_en: "",
      tagline_zh: "",
      tagline_en: "",
      description_zh: "",
      description_en: "",
      chip_label: "",
      web_flash_chip_family: "",
      display_order: 100,
      status: "draft",
      highlights_zh_text: "",
      highlights_en_text: "",
      features: {},
      feature_notes: {},
    });
    const boardEditor = ref(emptyBoard());
    const boardIsNew = ref(true);
    const boardImage = ref();
    const boardMessage = ref("");
    const featureDraft = ref({
      key: "",
      label_zh: "",
      label_en: "",
      description_zh: "",
      description_en: "",
      group: "general",
      display_order: 100,
      active: true,
    });
    const featureIsNew = ref(true);
    const aiImportJSON = ref("");

    const t = (key, values = {}) => {
      let text = messages[language.value][key] || messages.en[key] || key;
      for (const [name, value] of Object.entries(values))
        text = text.replace(`{${name}}`, String(value));
      return text;
    };
    const setLanguage = (value) => {
      language.value = value;
    };
    const boardName = (id) => {
      const entry = catalogBoards.value.find((b) => b.id === id);
      if (!entry) return id;
      return language.value === "zh" ? entry.name_zh : entry.name_en;
    };
    const requestError = async (response) => {
      const body = await response.json().catch(() => ({}));
      return body.error || t("unknownError");
    };

    async function loadCatalog(admin = false) {
      const path = admin ? "/api/v1/admin/catalog" : "/api/v1/catalog";
      const response = await fetch(
        apiURL(path),
        admin ? { headers: { "X-OTA-Token": session.value } } : undefined,
      );
      if (!response.ok) throw new Error(await requestError(response));
      const body = await response.json();
      catalogBoards.value = body.boards || [];
      catalogFeatures.value = body.features || [];
      if (!catalogBoards.value.some((b) => b.id === board.value))
        board.value = catalogBoards.value[0]?.id || "";
      if (!catalogBoards.value.some((b) => b.id === serialBoard.value))
        serialBoard.value = catalogBoards.value[0]?.id || "";
    }

    const historyLoading = ref(false);
    async function loadHistory() {
      loadError.value = "";
      historyLoading.value = true;
      const next = {};
      try {
        await Promise.all(
          catalogBoards.value
            .filter((b) => (b.status || "published") === "published")
            .map(async (b) => {
              // Administrators get the full list — including archived releases
              // (marked with archived_at) — so the table can offer
              // archive/restore actions.
              const response = await fetch(
                apiURL(
                  `${authed.value ? "/api/v1/admin/releases" : "/api/v1/releases"}?board=${encodeURIComponent(b.id)}`,
                ),
                authed.value ? { headers: { "X-OTA-Token": session.value } } : undefined,
              );
              if (!response.ok) throw new Error(await requestError(response));
              next[b.id] = (await response.json()).releases || [];
            }),
        );
        history.value = next;
      } catch (error) {
        loadError.value = t("loadFailed", { error: error.message });
      } finally {
        historyLoading.value = false;
      }
    }

    // Updated whenever the device list is (re)fetched; shown in the toolbar so
    // the 30-second auto-refresh is visible instead of happening silently.
    const lastRefresh = ref(0);
    async function loadDevices() {
      const response = await fetch(apiURL("/api/v1/admin/devices"), {
        headers: { "X-OTA-Token": session.value },
      });
      if (!response.ok) throw new Error(await requestError(response));
      devices.value = (await response.json()).devices || [];
      lastRefresh.value = Math.floor(Date.now() / 1000);
    }

    async function login() {
      loginError.value = "";
      try {
        const response = await fetch(apiURL("/api/v1/admin/login"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.value, password: password.value }),
        });
        if (!response.ok) throw new Error(await requestError(response));
        const body = await response.json();
        session.value = body.token;
        sessionUser.value = body.username;
        localStorage.otaSession = body.token;
        localStorage.otaUser = body.username;
        authed.value = true;
        password.value = "";
        await Promise.all([loadDevices(), loadCatalog(true), loadHistory()]);
        setView("devices");
      } catch (error) {
        authed.value = false;
        loginError.value = t("loginFailed", { error: error.message });
      }
    }
    function logout() {
      authed.value = false;
      devices.value = [];
      session.value = "";
      sessionUser.value = "";
      localStorage.removeItem("otaSession");
      localStorage.removeItem("otaUser");
      loadCatalog(false)
        .then(loadHistory)
        .catch(() => {});
      setView("home");
    }
    async function refreshDevices() {
      try {
        await Promise.all([loadDevices(), loadCatalog(true)]);
      } catch (error) {
        loginError.value = t("loginFailed", { error: error.message });
        authed.value = false;
        setView("login");
      }
    }

    // Restore an existing session on load by validating it against the API.
    async function restoreSession() {
      if (!session.value) return;
      try {
        await loadDevices();
        authed.value = true;
      } catch {
        logout();
      }
    }

    // Clipboard helper with per-target "copied" feedback. keyed so several
    // copy buttons on one page each show their own check mark.
    const copiedKey = ref("");
    let copiedTimer = null;
    async function copyText(text, key) {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        return; // clipboard is unavailable on insecure origins
      }
      copiedKey.value = key;
      clearTimeout(copiedTimer);
      copiedTimer = setTimeout(() => (copiedKey.value = ""), 1500);
    }
    const absoluteURL = (path) => new URL(path, location.origin).href;

    function exportCSV() {
      const escape = (value) => {
        const s = String(value ?? "");
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const header = ["device_id", "board", "firmware", "callsign", "ssid", "ip", "last_seen"];
      const lines = filteredRows.value.map((d) =>
        [
          d.device_id,
          boardName(d.board_type),
          d.firmware_version,
          d.metadata?.nrl_callsign || "",
          d.metadata?.nrl_ssid || "",
          d.ip_address,
          formatTime(d.last_seen),
        ]
          .map(escape)
          .join(","),
      );
      // The BOM keeps Excel from misreading UTF-8 Chinese text.
      const blob = new Blob([String.fromCharCode(0xfeff) + [header.join(","), ...lines].join("\n")], {
        type: "text/csv;charset=utf-8",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `nrl-devices-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    }

    // null = idle; 0–100 while the firmware is uploading.
    const publishPercent = ref(null);
    function upload() {
      const file = firmware.value?.files?.[0];
      if (!file || !version.value.trim()) {
        publishMessage.value = t("versionRequired");
        return;
      }
      if (
        !confirm(
          t("publishConfirm", {
            board: boardName(board.value),
            version: version.value.trim(),
            channel: channel.value,
          }),
        )
      )
        return;
      // XHR (not fetch) so the multi-MB firmware upload reports real progress.
      const xhr = new XMLHttpRequest();
      xhr.open("POST", apiURL("/api/v1/admin/releases"));
      xhr.setRequestHeader("X-OTA-Token", session.value);
      xhr.setRequestHeader("X-Firmware-Board", board.value);
      xhr.setRequestHeader("X-Firmware-Version", version.value.trim());
      xhr.setRequestHeader("X-Firmware-Channel", channel.value);
      xhr.setRequestHeader("X-Release-Notes", encodeURIComponent(notes.value));
      publishPercent.value = 0;
      publishMessage.value = "";
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable)
          publishPercent.value = Math.round((event.loaded / event.total) * 100);
      };
      xhr.onload = async () => {
        publishPercent.value = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          const released = JSON.parse(xhr.responseText);
          publishMessage.value = t("published", {
            version: released.version,
            size: released.size,
          });
          await Promise.all([loadHistory(), refreshDevices()]);
          return;
        }
        let error = t("unknownError");
        try {
          error = JSON.parse(xhr.responseText).error || error;
        } catch {
          // The proxy may have returned a non-JSON error page.
        }
        publishMessage.value = t("uploadFailed", { error });
      };
      xhr.onerror = () => {
        publishPercent.value = null;
        publishMessage.value = t("uploadFailed", { error: t("unknownError") });
      };
      xhr.send(file);
    }

    function editBoard(entry) {
      boardIsNew.value = false;
      boardEditor.value = {
        ...entry,
        highlights_zh_text: (entry.highlights_zh || []).join("\n"),
        highlights_en_text: (entry.highlights_en || []).join("\n"),
        features: { ...entry.features },
        // entry is a Vue reactive proxy, which structuredClone rejects with
        // DataCloneError; a JSON round-trip also strips reactivity.
        feature_notes: JSON.parse(JSON.stringify(entry.feature_notes || {})),
      };
      for (const f of catalogFeatures.value) {
        boardEditor.value.feature_notes[f.key] ||= { zh: "", en: "" };
      }
      boardMessage.value = "";
    }

    function newBoard() {
      boardIsNew.value = true;
      boardEditor.value = emptyBoard();
      for (const f of catalogFeatures.value) {
        boardEditor.value.features[f.key] = "no";
        boardEditor.value.feature_notes[f.key] = { zh: "", en: "" };
      }
      boardMessage.value = "";
    }

    function boardPayload() {
      const b = boardEditor.value;
      return {
        id: b.id.trim(),
        name_zh: b.name_zh.trim(),
        name_en: b.name_en.trim(),
        tagline_zh: b.tagline_zh.trim(),
        tagline_en: b.tagline_en.trim(),
        description_zh: b.description_zh.trim(),
        description_en: b.description_en.trim(),
        chip_label: b.chip_label.trim(),
        web_flash_chip_family: b.web_flash_chip_family.trim(),
        display_order: Number(b.display_order) || 0,
        status: b.status,
        highlights_zh: b.highlights_zh_text
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean),
        highlights_en: b.highlights_en_text
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean),
      };
    }

    async function saveBoard() {
      boardMessage.value = "";
      try {
        const payload = boardPayload();
        const response = await fetch(
          apiURL(
            boardIsNew.value
              ? "/api/v1/admin/boards"
              : `/api/v1/admin/boards/${encodeURIComponent(payload.id)}`,
          ),
          {
            method: boardIsNew.value ? "POST" : "PUT",
            headers: { "Content-Type": "application/json", "X-OTA-Token": session.value },
            body: JSON.stringify(payload),
          },
        );
        if (!response.ok) throw new Error(await requestError(response));
        await loadCatalog(true);
        const saved = catalogBoards.value.find((b) => b.id === payload.id);
        if (saved) editBoard(saved);
        boardMessage.value = t("boardSaved");
      } catch (error) {
        boardMessage.value = t("manageFailed", { error: error.message });
      }
    }

    async function uploadBoardImage() {
      const file = boardImage.value?.files?.[0];
      if (!file || boardIsNew.value) return;
      try {
        const response = await fetch(
          apiURL(`/api/v1/admin/boards/${encodeURIComponent(boardEditor.value.id)}/image`),
          {
            method: "POST",
            headers: {
              "Content-Type": file.type || "application/octet-stream",
              "X-OTA-Token": session.value,
            },
            body: file,
          },
        );
        if (!response.ok) throw new Error(await requestError(response));
        await loadCatalog(true);
        const saved = catalogBoards.value.find((b) => b.id === boardEditor.value.id);
        if (saved) editBoard(saved);
        boardMessage.value = t("imageUploaded");
      } catch (error) {
        boardMessage.value = t("manageFailed", { error: error.message });
      }
    }

    async function saveBoardFeatures() {
      if (boardIsNew.value) return;
      try {
        const assignments = {};
        for (const f of catalogFeatures.value) {
          const note = boardEditor.value.feature_notes[f.key] || {};
          assignments[f.key] = {
            state: boardEditor.value.features[f.key] || "no",
            note_zh: note.zh || "",
            note_en: note.en || "",
          };
        }
        const response = await fetch(
          apiURL(`/api/v1/admin/boards/${encodeURIComponent(boardEditor.value.id)}/features`),
          {
            method: "PUT",
            headers: { "Content-Type": "application/json", "X-OTA-Token": session.value },
            body: JSON.stringify({ features: assignments }),
          },
        );
        if (!response.ok) throw new Error(await requestError(response));
        await loadCatalog(true);
        const saved = catalogBoards.value.find((b) => b.id === boardEditor.value.id);
        if (saved) editBoard(saved);
        boardMessage.value = t("featuresSaved");
      } catch (error) {
        boardMessage.value = t("manageFailed", { error: error.message });
      }
    }

    async function addFeature() {
      try {
        const key = featureDraft.value.key;
        const response = await fetch(
          apiURL(
            featureIsNew.value
              ? "/api/v1/admin/features"
              : `/api/v1/admin/features/${encodeURIComponent(key)}`,
          ),
          {
            method: featureIsNew.value ? "POST" : "PUT",
            headers: { "Content-Type": "application/json", "X-OTA-Token": session.value },
            body: JSON.stringify(featureDraft.value),
          },
        );
        if (!response.ok) throw new Error(await requestError(response));
        await loadCatalog(true);
        boardEditor.value.features[key] ||= "no";
        boardEditor.value.feature_notes[key] ||= { zh: "", en: "" };
        newFeatureDraft();
        boardMessage.value = t("featureAdded");
      } catch (error) {
        boardMessage.value = t("manageFailed", { error: error.message });
      }
    }

    function newFeatureDraft() {
      featureIsNew.value = true;
      featureDraft.value = {
        key: "",
        label_zh: "",
        label_en: "",
        description_zh: "",
        description_en: "",
        group: "general",
        display_order: 100,
        active: true,
      };
    }

    function editFeature(feature) {
      featureIsNew.value = false;
      featureDraft.value = { ...feature };
    }

    async function importCatalog() {
      try {
        const payload = JSON.parse(aiImportJSON.value);
        const response = await fetch(apiURL("/api/v1/admin/catalog/import"), {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-OTA-Token": session.value },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(await requestError(response));
        const result = await response.json();
        await loadCatalog(true);
        const saved = catalogBoards.value.find((b) => b.id === result.id);
        if (saved) editBoard(saved);
        boardMessage.value = t("catalogImported");
      } catch (error) {
        boardMessage.value = t("manageFailed", { error: error.message });
      }
    }

    const formatTime = (timestamp) =>
      new Date(timestamp * 1000).toLocaleString(language.value === "zh" ? "zh-CN" : "en-US");
    const formatSize = (bytes) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };
    const localizedBoards = computed(() =>
      catalogBoards.value.map((b) => ({
        id: b.id,
        chip: b.chip_label,
        flashable: Boolean(b.web_flash_chip_family),
        image: b.image_url,
        name: language.value === "zh" ? b.name_zh : b.name_en,
        tagline: language.value === "zh" ? b.tagline_zh : b.tagline_en,
        description: language.value === "zh" ? b.description_zh : b.description_en,
        features: language.value === "zh" ? b.highlights_zh : b.highlights_en,
        status: b.status,
      })),
    );
    const localizedFeatureMatrix = computed(() =>
      catalogFeatures.value
        .filter((f) => f.active)
        .map((f) => {
          const row = { key: f.key, label: language.value === "zh" ? f.label_zh : f.label_en };
          for (const b of catalogBoards.value) {
            row[b.id] = b.features?.[f.key] || "no";
            row[`${b.id}_note`] = b.feature_notes?.[f.key]?.[language.value] || "";
          }
          return row;
        }),
    );
    const publicBoards = computed(() =>
      localizedBoards.value.filter((b) => !b.status || b.status === "published"),
    );
    const uploadBoards = computed(() =>
      localizedBoards.value.filter((b) => b.status !== "archived"),
    );
    const visibleBoards = computed(() => {
      const q = boardSearch.value.trim().toLowerCase();
      if (!q) return publicBoards.value;
      return publicBoards.value.filter((b) =>
        [b.id, b.name, b.tagline, b.chip].filter(Boolean).join(" ").toLowerCase().includes(q),
      );
    });
    const featureMark = (state) => ({ yes: "✓", partial: "△", no: "—" })[state] || "—";

    // A board is only web-flashable if its full-flash manifest has been staged
    // into the server's data-dir. Probe so boards without a staged package show
    // a clear message instead of a button that fails when clicked.
    const flasherReady = ref({});
    async function loadFlasher() {
      const next = {};
      await Promise.all(
        catalogBoards.value
          .filter((b) => b.web_flash_chip_family)
          .map(async (b) => {
            try {
              const response = await fetch(apiURL(`/flasher/manifest-${b.id}.json`), {
                cache: "no-store",
              });
              next[b.id] = response.ok;
            } catch {
              next[b.id] = false;
            }
          }),
      );
      flasherReady.value = next;
    }

    // Views: home | firmware | flash | serial | login | devices | publish. The devices
    // and publish views are gated behind a valid session; navigating to them
    // while logged out sends the user to login. Keep the URL hash in sync for
    // refresh/back support.
    const views = ["home", "firmware", "flash", "serial", "login", "devices", "publish", "boards"];
    const adminViews = ["devices", "publish", "boards"];
    function setView(next) {
      if (adminViews.includes(next) && !authed.value) next = "login";
      if (next === "login" && authed.value) next = "devices";
      if (!views.includes(next)) next = "home";
      view.value = next;
      if (location.hash.slice(1) !== next) location.hash = next;
    }
    function syncFromHash() {
      setView(location.hash.slice(1) || "home");
    }
    window.addEventListener("hashchange", syncFromHash);

    // esp-web-tools (~370 KB) is only needed on the flash view; load it on
    // first visit instead of at startup.
    function ensureEspWebTools() {
      if (document.querySelector("script[data-esp-web-tools]")) return;
      const script = document.createElement("script");
      script.type = "module";
      script.src = "/esp-web-tools/install-button.js?v=4";
      script.dataset.espWebTools = "1";
      document.head.appendChild(script);
    }
    watch(view, (value) => {
      if (value === "flash") ensureEspWebTools();
    });

    // Auto-refresh the device list every 30 s while the dashboard is open.
    let devicesTimer = null;
    watch([view, authed], () => {
      if (devicesTimer) {
        clearInterval(devicesTimer);
        devicesTimer = null;
      }
      if (view.value === "devices" && authed.value)
        devicesTimer = setInterval(refreshDevices, 30000);
    });

    // Device-management dashboard summary.
    const nowSeconds = () => Math.floor(Date.now() / 1000);
    const isOnline = (device) => nowSeconds() - device.last_seen < 300; // 5 min
    const latestByBoard = computed(() => {
      const map = {};
      for (const b of catalogBoards.value) {
        const list = history.value[b.id] || [];
        if (list.length) map[b.id] = list[0].version;
      }
      return map;
    });

    // Per-board quick actions.
    const latestRelease = (id) => (history.value[id] || [])[0];
    function scrollToBoard(id) {
      document.getElementById(`board-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // The "latest" badge belongs to the newest non-archived release; the admin
    // history includes archived rows, which must not claim it.
    const isLatestActive = (boardId, release) => {
      const first = (history.value[boardId] || []).find((x) => !x.archived_at);
      return first === release;
    };

    async function setReleaseArchived(boardId, release, archived) {
      if (
        !confirm(
          t(archived ? "archiveConfirm" : "restoreConfirm", {
            board: boardName(boardId),
            version: release.version,
          }),
        )
      )
        return;
      const response = await fetch(
        apiURL(`/api/v1/admin/releases/${archived ? "archive" : "restore"}`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-OTA-Token": session.value },
          body: JSON.stringify({
            board: boardId,
            version: release.version,
            channel: release.channel,
          }),
        },
      );
      if (!response.ok) {
        loadError.value = await requestError(response);
        return;
      }
      await loadHistory();
    }

    async function deleteRelease(boardId, release) {
      if (
        !confirm(
          t("deleteConfirm", {
            board: boardName(boardId),
            version: release.version,
            channel: release.channel,
          }),
        )
      )
        return;
      const response = await fetch(apiURL("/api/v1/admin/releases/delete"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-OTA-Token": session.value },
        body: JSON.stringify({
          board: boardId,
          version: release.version,
          channel: release.channel,
        }),
      });
      if (!response.ok) {
        loadError.value = await requestError(response);
        return;
      }
      await loadHistory();
    }

    async function deleteDevice(deviceId) {
      if (!confirm(t("deleteDeviceConfirm", { id: deviceId }))) return;
      const response = await fetch(apiURL("/api/v1/admin/devices/delete"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-OTA-Token": session.value },
        body: JSON.stringify({ device_id: deviceId }),
      });
      if (!response.ok) {
        loginError.value = await requestError(response);
        return;
      }
      await loadDevices();
    }

    const deviceRows = computed(() =>
      devices.value.map((d) => {
        const latest = latestByBoard.value[d.board_type];
        return {
          ...d,
          online: isOnline(d),
          latest,
          outdated: latest ? latest !== d.firmware_version : false,
        };
      }),
    );
    const stats = computed(() => {
      const rows = deviceRows.value;
      return {
        total: rows.length,
        online: rows.filter((d) => d.online).length,
        boards: new Set(rows.map((d) => d.board_type)).size,
        outdated: rows.filter((d) => d.outdated).length,
      };
    });

    // Search / filter / pagination for large fleets. Filtering is client-side;
    // the stat cards double as quick filters. (For very large deployments the
    // /admin/devices endpoint would move to server-side paging.)
    const search = ref("");
    const statusFilter = ref("all"); // all | online | offline | outdated
    const page = ref(1);
    const pageSize = 20;
    const setFilter = (value) => {
      statusFilter.value = statusFilter.value === value ? "all" : value;
    };
    const filteredRows = computed(() => {
      const q = search.value.trim().toLowerCase();
      return deviceRows.value.filter((d) => {
        if (statusFilter.value === "online" && !d.online) return false;
        if (statusFilter.value === "offline" && d.online) return false;
        if (statusFilter.value === "outdated" && !d.outdated) return false;
        if (!q) return true;
        const hay = [
          d.device_id,
          d.board_type,
          boardName(d.board_type),
          d.firmware_version,
          d.ip_address,
          d.metadata?.nrl_callsign,
          d.metadata?.nrl_ssid,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    });
    const pageCount = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / pageSize)));
    const pagedRows = computed(() => {
      const start = (page.value - 1) * pageSize;
      return filteredRows.value.slice(start, start + pageSize);
    });
    const pageFrom = computed(() =>
      filteredRows.value.length ? (page.value - 1) * pageSize + 1 : 0,
    );
    const pageTo = computed(() => Math.min(page.value * pageSize, filteredRows.value.length));
    const goPage = (delta) => {
      page.value = Math.min(pageCount.value, Math.max(1, page.value + delta));
    };
    watch([search, statusFilter], () => {
      page.value = 1;
    });

    watch(
      language,
      (value) => {
        localStorage.otaLanguage = value;
        document.documentElement.lang = value === "zh" ? "zh-CN" : "en";
        document.title = t("title");
      },
      { immediate: true },
    );

    async function bootstrap() {
      try {
        await loadCatalog(false);
      } catch (error) {
        loadError.value = t("loadFailed", { error: error.message });
      }
      await Promise.all([loadHistory(), loadFlasher()]);
      await restoreSession();
      if (authed.value) await Promise.all([loadHistory(), loadFlasher()]);
      syncFromHash();
    }
    void bootstrap();

    return {
      language,
      view,
      setView,
      theme,
      toggleTheme,
      authed,
      sessionUser,
      username,
      password,
      history,
      devices,
      deviceRows,
      stats,
      search,
      statusFilter,
      setFilter,
      pagedRows,
      filteredRows,
      page,
      pageCount,
      pageFrom,
      pageTo,
      goPage,
      loadError,
      copiedKey,
      copyText,
      absoluteURL,
      historyLoading,
      scrollToBoard,
      latestRelease,
      latestByBoard,
      isLatestActive,
      setReleaseArchived,
      deleteRelease,
      deleteDevice,
      lastRefresh,
      exportCSV,
      boardSearch,
      visibleBoards,
      publicBoards,
      uploadBoards,
      loginError,
      flasherReady,
      secureContext,
      webSerialAvailable,
      serialBoard,
      serialConnected,
      serialOutput,
      serialInput,
      serialMessage,
      serialOutputEl,
      serialPrompt,
      connectSerial,
      disconnectSerial,
      sendSerialCommand,
      sendSerialText,
      serialHistoryNav,
      openSerialDebug,
      board,
      version,
      channel,
      notes,
      firmware,
      publishMessage,
      publishPercent,
      catalogBoards,
      catalogFeatures,
      boardEditor,
      boardIsNew,
      boardImage,
      boardMessage,
      featureDraft,
      featureIsNew,
      aiImportJSON,
      apiURL,
      t,
      setLanguage,
      boardName,
      localizedBoards,
      localizedFeatureMatrix,
      featureMark,
      loadHistory,
      loadCatalog,
      login,
      logout,
      refreshDevices,
      upload,
      editBoard,
      newBoard,
      saveBoard,
      uploadBoardImage,
      saveBoardFeatures,
      addFeature,
      newFeatureDraft,
      editFeature,
      importCatalog,
      formatTime,
      formatSize,
    };
  },
  template: `
    <div class="app">
      <header class="navbar">
        <div class="nav-brand" @click="setView('home')">
          <span class="nav-logo"><icon name="radio" /></span><span class="nav-title">{{ t('brandName') }}</span>
        </div>
        <nav class="nav-menu">
          <button :class="{ active: view === 'home' }" @click="setView('home')"><icon name="home" />{{ t('navHome') }}</button>
          <button :class="{ active: view === 'firmware' }" @click="setView('firmware')"><icon name="download" />{{ t('navFirmware') }}</button>
          <button :class="{ active: view === 'flash' }" @click="setView('flash')"><icon name="cpu" />{{ t('navFlash') }}</button>
          <button :class="{ active: view === 'serial' }" @click="setView('serial')"><icon name="terminal" />{{ t('navSerial') }}</button>
          <button v-if="authed" :class="{ active: view === 'devices' }" @click="setView('devices')"><icon name="server" />{{ t('navDevices') }}</button>
					<button v-if="authed" :class="{ active: view === 'boards' }" @click="setView('boards')"><icon name="grid" />{{ t('navBoards') }}</button>
          <button v-if="authed" :class="{ active: view === 'publish' }" @click="setView('publish')"><icon name="upload" />{{ t('navPublish') }}</button>
        </nav>
        <div class="nav-right">
          <button class="icon-btn nav-theme" :title="theme === 'dark' ? t('themeToLight') : t('themeToDark')" :aria-label="theme === 'dark' ? t('themeToLight') : t('themeToDark')" @click="toggleTheme"><icon :name="theme === 'dark' ? 'sun' : 'moon'" /></button>
          <div class="language" :aria-label="t('language')">
            <button :class="{ active: language === 'zh' }" @click="setLanguage('zh')">中</button>
            <button :class="{ active: language === 'en' }" @click="setLanguage('en')">EN</button>
          </div>
          <template v-if="authed">
            <span class="user-chip"><span class="user-avatar">{{ sessionUser.slice(0, 1).toUpperCase() }}</span>{{ sessionUser }}</span>
            <button class="ghost" @click="logout">{{ t('logout') }}</button>
          </template>
          <button v-else class="primary" @click="setView('login')"><icon name="user" />{{ t('adminLogin') }}</button>
        </div>
      </header>

      <main class="content">
        <!-- Home: board introductions -->
        <section v-if="view === 'home'" class="view">
          <div class="hero">
            <h1 class="hero-title">{{ t('title') }}</h1>
            <p class="hero-sub">{{ t('subtitle') }}</p>
          </div>
						<div class="catalog-home-toolbar">
							<div><h2 class="section-h">{{ t('boardsHeading') }}</h2><span class="muted-sm">{{ t('boardCount', { count: visibleBoards.length }) }}</span></div>
							<input v-model="boardSearch" class="search" type="search" :placeholder="t('boardSearch')">
						</div>
          <div class="board-grid board-intro-grid">
							<article v-for="b in visibleBoards" :key="b.id" class="board-card">
              <img class="board-image" :src="b.image" :alt="b.name" loading="lazy" />
              <div class="board-card-head">
                <h3>{{ b.name }}</h3>
                <span class="chip">{{ b.chip }}</span>
              </div>
              <p class="tagline">{{ b.tagline }}</p>
							<p v-if="b.description" class="board-description">{{ b.description }}</p>
              <ul class="features">
                <li v-for="feature in b.features" :key="feature">{{ feature }}</li>
              </ul>
              <div class="card-actions">
                <a v-if="latestRelease(b.id)" class="mini-btn" :href="latestRelease(b.id).url"><icon name="download" />{{ t('downloadLatest') }}</a>
                <button v-if="b.flashable" class="mini-btn" @click="setView('flash')"><icon name="cpu" />{{ t('flashButton') }}</button>
              </div>
              <code class="board-id">{{ b.id }}</code>
            </article>
          </div>
          <section class="panel feature-matrix-panel">
            <div class="feature-matrix-head">
              <div>
                <h2 class="section-h">{{ t('featureMatrixHeading') }}</h2>
                <p class="hint">{{ t('featureMatrixHint') }}</p>
              </div>
            </div>
            <div class="table-scroll">
              <table class="feature-matrix">
                <thead>
									<tr><th>{{ t('function') }}</th><th v-for="b in visibleBoards" :key="b.id">{{ b.name }}</th></tr>
                </thead>
                <tbody>
                  <tr v-for="row in localizedFeatureMatrix" :key="row.label">
                    <th>{{ row.label }}</th>
									<td v-for="b in visibleBoards" :key="b.id">
										<span :title="row[b.id + '_note'] || ''" :class="['feature-mark', 'feature-' + (row[b.id] || row.all)]">{{ featureMark(row[b.id] || row.all) }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </section>

        <!-- Firmware download / history -->
        <section v-else-if="view === 'firmware'" class="view">
          <div class="view-head row">
            <h1>{{ t('navFirmware') }}</h1>
            <button class="ghost" @click="loadHistory">{{ t('refresh') }}</button>
          </div>
          <p v-if="loadError" class="error">{{ loadError }}</p>
          <div v-if="publicBoards.length > 1" class="anchor-chips">
            <a v-for="b in publicBoards" :key="b.id" href="#" @click.prevent="scrollToBoard(b.id)">{{ b.name }}</a>
          </div>
          <div v-if="historyLoading && !Object.keys(history).length" class="panel skeleton-panel" :aria-label="t('loading')">
            <div class="sk-line" v-for="i in 4" :key="i"></div>
          </div>
					<div v-for="b in publicBoards" :key="b.id" class="panel board-history" :id="'board-' + b.id">
            <div class="board-history-head"><h3>{{ b.name }}</h3><code class="board-id">{{ b.id }}</code></div>
            <div class="table-scroll" v-if="(history[b.id] || []).length">
              <table>
                <thead>
                  <tr><th>{{ t('version') }}</th><th>{{ t('channel') }}</th><th>{{ t('size') }}</th><th class="notes-col">{{ t('notes') }}</th><th>{{ t('releasedAt') }}</th><th>{{ t('sha256') }}</th><th></th><th v-if="authed">{{ t('actions') }}</th></tr>
                </thead>
                <tbody>
                  <tr v-for="release in history[b.id]" :key="release.version + release.channel" :class="{ 'archived-row': release.archived_at }">
                    <td><strong>{{ release.version }}</strong> <span v-if="isLatestActive(b.id, release)" class="badge latest">{{ t('latest') }}</span><span v-if="release.archived_at" class="badge archived">{{ t('archived') }}</span></td>
                    <td><span class="badge" :class="release.channel">{{ release.channel === 'stable' ? t('stable') : t('beta') }}</span></td>
                    <td>{{ formatSize(release.size) }}</td>
                    <td class="notes-col">{{ release.notes || t('noNotes') }}</td>
                    <td>{{ formatTime(release.created_at) }}</td>
                    <td class="sha-cell"><code class="mono" :title="release.sha256">{{ (release.sha256 || '').slice(0, 16) }}…</code><button class="icon-btn" :title="copiedKey === 'sha-' + release.url ? t('copied') : t('copy')" @click="copyText(release.sha256, 'sha-' + release.url)"><icon :name="copiedKey === 'sha-' + release.url ? 'check' : 'copy'" /></button></td>
                    <td class="dl-cell"><a class="download" :href="release.url">{{ t('download') }}</a><button class="icon-btn" :title="copiedKey === 'link-' + release.url ? t('copied') : t('copyLink')" @click="copyText(absoluteURL(release.url), 'link-' + release.url)"><icon :name="copiedKey === 'link-' + release.url ? 'check' : 'copy'" /></button></td>
                    <td v-if="authed" class="release-actions">
                      <button v-if="!release.archived_at" class="mini-btn" @click="setReleaseArchived(b.id, release, true)">{{ t('archive') }}</button>
                      <button v-else class="mini-btn" @click="setReleaseArchived(b.id, release, false)">{{ t('restore') }}</button>
                      <button class="mini-btn danger" @click="deleteRelease(b.id, release)">{{ t('deleteRelease') }}</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="empty">{{ t('noReleases') }}</p>
          </div>
        </section>

        <!-- USB web flashing -->
        <section v-else-if="view === 'flash'" class="view">
          <div class="view-head">
            <h1>{{ t('flashHeading') }}</h1>
            <p class="subtitle">{{ t('flashIntro') }}</p>
          </div>
          <div class="board-grid">
							<article v-for="b in publicBoards" :key="b.id" class="board-card flash-card">
              <div class="board-card-head">
                <h3>{{ b.name }}</h3>
                <span class="chip">{{ b.chip }}</span>
              </div>
              <template v-if="b.flashable">
                <p class="tagline">{{ t('flashReady') }}</p>
                <template v-if="flasherReady[b.id]">
                  <p v-if="!secureContext" class="unsupported">{{ t('flashNeedsHttps') }}</p>
                  <p v-else-if="!webSerialAvailable" class="unsupported">{{ t('flashUnsupported') }}</p>
                  <template v-else>
                    <esp-web-install-button :manifest="apiURL('/flasher/manifest-' + b.id + '.json')">
                      <button slot="activate" class="flash-btn primary">{{ t('flashButton') }}</button>
                      <span slot="unsupported" class="unsupported">{{ t('flashUnsupported') }}</span>
                      <span slot="not-allowed" class="unsupported">{{ t('flashNotAllowed') }}</span>
                    </esp-web-install-button>
                    <p class="flash-tip">{{ t('flashTip') }}</p>
                  </template>
                </template>
                <p v-else class="empty">{{ t('flashUnavailable') }}</p>
              </template>
              <p v-else class="tagline serial-only">{{ t('flashSerialOnly') }}</p>
              <button class="ghost serial-open" @click="openSerialDebug(b.id)">{{ t('navSerial') }}</button>
              <code class="board-id">{{ b.id }}</code>
            </article>
          </div>
        </section>

        <!-- Interactive Web Serial terminal. The editable line is deliberately
             outside the scrolling debug output, so logs never disrupt typing. -->
        <section v-else-if="view === 'serial'" class="view">
          <div class="view-head">
            <h1>{{ t('serialHeading') }}</h1>
            <p class="subtitle">{{ t('serialIntro') }}</p>
          </div>
          <div class="panel serial-panel">
            <div class="serial-toolbar">
              <label>{{ t('serialBoard') }}
                <select v-model="serialBoard" :disabled="serialConnected">
									<option v-for="b in publicBoards" :key="b.id" :value="b.id">{{ b.name }}</option>
                </select>
              </label>
              <button v-if="!serialConnected" class="primary" :disabled="!webSerialAvailable" @click="connectSerial">{{ t('serialConnect') }}</button>
              <button v-else class="ghost" @click="disconnectSerial">{{ t('serialDisconnect') }}</button>
            </div>
            <p v-if="!webSerialAvailable" class="unsupported">{{ t('serialUnsupported') }}</p>
            <p v-if="serialMessage" class="error">{{ serialMessage }}</p>
            <div class="serial-actions">
              <button class="mini-btn" :disabled="!serialConnected" @click="sendSerialText('AT')">AT</button>
              <button class="mini-btn" :disabled="!serialOutput" @click="serialOutput = ''">{{ t('serialClear') }}</button>
              <button class="mini-btn" :disabled="!serialOutput" @click="copyText(serialOutput, 'serialLog')"><icon :name="copiedKey === 'serialLog' ? 'check' : 'copy'" />{{ copiedKey === 'serialLog' ? t('copied') : t('serialCopyLog') }}</button>
            </div>
            <div class="serial-terminal" @click="$refs.serialCommand?.focus()">
              <pre ref="serialOutputEl" class="serial-output">{{ serialOutput }}</pre>
              <form class="serial-command" @submit.prevent="sendSerialCommand">
                <span class="serial-prompt">{{ serialPrompt }}</span>
                <input ref="serialCommand" v-model="serialInput" :disabled="!serialConnected" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="AT command" @keydown.up.prevent="serialHistoryNav(-1)" @keydown.down.prevent="serialHistoryNav(1)">
              </form>
            </div>
          </div>
        </section>

        <!-- Admin login -->
        <section v-else-if="view === 'login'" class="view login-view">
          <div class="login-card">
            <div class="login-logo"><icon name="radio" /></div>
            <h2>{{ t('loginTitle') }}</h2>
            <p class="hint">{{ t('adminHint') }}</p>
            <label>{{ t('username') }}<input v-model="username" autocomplete="username" @keyup.enter="login"></label>
            <label>{{ t('password') }}<input v-model="password" type="password" autocomplete="current-password" @keyup.enter="login"></label>
            <button class="primary block" @click="login">{{ t('login') }}</button>
            <p v-if="loginError" class="error">{{ loginError }}</p>
          </div>
        </section>

        <!-- Device management dashboard -->
        <section v-else-if="view === 'devices'" class="view">
          <div class="view-head row">
            <h1>{{ t('dashboardTitle') }}</h1>
            <button class="ghost" @click="refreshDevices">{{ t('refresh') }}</button>
          </div>
          <div class="stat-grid">
            <button type="button" class="stat-card" :class="{ active: statusFilter === 'all' }" @click="statusFilter = 'all'">
              <span class="stat-num">{{ stats.total }}</span><span class="stat-label">{{ t('statTotal') }}</span>
            </button>
            <button type="button" class="stat-card" :class="{ active: statusFilter === 'online' }" @click="setFilter('online')">
              <span class="stat-num accent-green">{{ stats.online }}</span><span class="stat-label">{{ t('statOnline') }}</span>
            </button>
            <div class="stat-card static">
              <span class="stat-num">{{ stats.boards }}</span><span class="stat-label">{{ t('statBoards') }}</span>
            </div>
            <button type="button" class="stat-card" :class="{ active: statusFilter === 'outdated' }" @click="setFilter('outdated')">
              <span class="stat-num accent-amber">{{ stats.outdated }}</span><span class="stat-label">{{ t('statOutdated') }}</span>
            </button>
          </div>
          <p v-if="loginError" class="error">{{ loginError }}</p>
          <div class="panel table-panel">
            <div class="table-toolbar">
              <input class="search" v-model="search" type="search" :placeholder="t('searchPlaceholder')">
              <div class="toolbar-side">
                <span class="muted-sm" v-if="lastRefresh">{{ t('lastRefresh', { time: formatTime(lastRefresh) }) }}</span>
                <span class="muted-sm">{{ t('onlineHint') }}</span>
                <button class="ghost" :disabled="!filteredRows.length" @click="exportCSV"><icon name="download" />{{ t('exportCSV') }}</button>
              </div>
            </div>
            <div class="table-scroll sticky" v-if="filteredRows.length">
              <table>
                <thead>
                  <tr><th>{{ t('deviceId') }}</th><th>{{ t('board') }}</th><th>{{ t('firmware') }}</th><th>{{ t('callsign') }}</th><th>{{ t('ssid') }}</th><th>{{ t('ipAddress') }}</th><th>{{ t('lastSeen') }}</th><th>{{ t('actions') }}</th></tr>
                </thead>
                <tbody>
                  <tr v-for="d in pagedRows" :key="d.device_id">
                    <td class="mono">{{ d.device_id }}</td>
                    <td>{{ boardName(d.board_type) }}</td>
                    <td>{{ d.firmware_version }} <span v-if="d.outdated" class="badge beta">{{ t('updateAvailable') }}</span><span v-else-if="d.latest" class="badge stable">{{ t('upToDate') }}</span></td>
                    <td>{{ d.metadata?.nrl_callsign || '-' }}</td>
                    <td>{{ d.metadata?.nrl_ssid ?? '-' }}</td>
                    <td class="mono">{{ d.ip_address }}</td>
                    <td>{{ formatTime(d.last_seen) }}</td>
                    <td><button class="mini-btn danger" @click="deleteDevice(d.device_id)">{{ t('deleteDevice') }}</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else-if="deviceRows.length" class="empty">{{ t('noMatch') }}</p>
            <p v-else class="empty">{{ t('noDevices') }}</p>
            <div class="pager" v-if="pageCount > 1">
              <span class="muted-sm">{{ t('pageInfo', { from: pageFrom, to: pageTo, total: filteredRows.length }) }}</span>
              <div class="pager-controls">
                <button class="ghost" :disabled="page <= 1" @click="goPage(-1)">{{ t('prevPage') }}</button>
                <span class="muted-sm">{{ t('pageOf', { page: page, count: pageCount }) }}</span>
                <button class="ghost" :disabled="page >= pageCount" @click="goPage(1)">{{ t('nextPage') }}</button>
              </div>
            </div>
          </div>
        </section>

				<!-- Board type, image and feature catalog management -->
				<section v-else-if="view === 'boards'" class="view">
					<div class="view-head row">
						<div><h1>{{ t('boardManagerTitle') }}</h1><p class="subtitle">{{ t('boardManagerHint') }}</p></div>
						<button class="primary" @click="newBoard">{{ t('newBoard') }}</button>
					</div>
					<div class="catalog-layout">
						<aside class="panel board-list">
							<button v-for="b in catalogBoards" :key="b.id" :class="{ active: !boardIsNew && boardEditor.id === b.id }" @click="editBoard(b)">
								<strong>{{ language === 'zh' ? b.name_zh : b.name_en }}</strong>
								<code>{{ b.id }}</code><span class="badge" :class="b.status === 'published' ? 'stable' : 'beta'">{{ b.status }}</span>
							</button>
						</aside>
						<div>
							<div class="panel publish-grid">
								<label>{{ t('boardId') }}<input v-model.trim="boardEditor.id" :disabled="!boardIsNew" pattern="[a-z0-9][a-z0-9_-]*"></label>
								<label>{{ t('boardStatus') }}<select v-model="boardEditor.status"><option value="draft">{{ t('draft') }}</option><option value="published">{{ t('publishedStatus') }}</option><option value="archived">{{ t('archived') }}</option></select></label>
								<label>{{ t('nameZH') }}<input v-model="boardEditor.name_zh"></label>
								<label>{{ t('nameEN') }}<input v-model="boardEditor.name_en"></label>
								<label>{{ t('taglineZH') }}<input v-model="boardEditor.tagline_zh"></label>
								<label>{{ t('taglineEN') }}<input v-model="boardEditor.tagline_en"></label>
								<label class="wide">{{ t('descriptionZH') }}<textarea v-model="boardEditor.description_zh"></textarea></label>
								<label class="wide">{{ t('descriptionEN') }}<textarea v-model="boardEditor.description_en"></textarea></label>
								<label>{{ t('chipLabel') }}<input v-model="boardEditor.chip_label" placeholder="ESP32-S3"></label>
								<label>{{ t('webFlashFamily') }}<input v-model="boardEditor.web_flash_chip_family" placeholder="ESP32-S3"></label>
								<label>{{ t('displayOrder') }}<input v-model.number="boardEditor.display_order" type="number"></label>
								<label class="wide">{{ t('highlightsZH') }}<textarea v-model="boardEditor.highlights_zh_text"></textarea></label>
								<label class="wide">{{ t('highlightsEN') }}<textarea v-model="boardEditor.highlights_en_text"></textarea></label>
								<div class="actions wide"><button class="primary" @click="saveBoard">{{ t('saveBoard') }}</button></div>
							</div>

							<div v-if="!boardIsNew" class="panel">
								<h2 class="panel-h">{{ t('boardImage') }}</h2>
								<div class="image-upload-row">
									<img v-if="boardEditor.image_url" class="board-image-preview" :src="boardEditor.image_url" :alt="boardEditor.name_en">
									<div><input ref="boardImage" type="file" accept="image/jpeg,image/png,image/webp"><button class="primary image-upload-button" @click="uploadBoardImage">{{ t('uploadImage') }}</button></div>
								</div>
							</div>

							<div v-if="!boardIsNew" class="panel">
								<h2 class="panel-h">{{ t('featureAssignments') }}</h2>
								<div class="feature-editor-grid">
									<div v-for="f in catalogFeatures" :key="f.key" class="feature-assignment">
										<div class="feature-assignment-row">
											<span>{{ language === 'zh' ? f.label_zh : f.label_en }} <code>{{ f.key }}</code></span>
											<select v-model="boardEditor.features[f.key]"><option value="yes">{{ t('featureYes') }}</option><option value="partial">{{ t('featurePartial') }}</option><option value="no">{{ t('featureNo') }}</option></select>
										</div>
										<div v-if="boardEditor.features[f.key] === 'partial'" class="feature-note-row">
											<input v-model="boardEditor.feature_notes[f.key].zh" :placeholder="t('partialNoteZH')">
											<input v-model="boardEditor.feature_notes[f.key].en" :placeholder="t('partialNoteEN')">
										</div>
									</div>
								</div>
								<div class="actions"><button class="primary" @click="saveBoardFeatures">{{ t('saveFeatures') }}</button></div>
							</div>

							<div class="panel">
								<div class="panel-head"><h2>{{ featureIsNew ? t('addFeature') : t('editFeature') }}</h2><button class="ghost" @click="newFeatureDraft">{{ t('newFeature') }}</button></div>
								<div class="feature-picker">
									<button v-for="f in catalogFeatures" :key="f.key" class="ghost" @click="editFeature(f)">{{ language === 'zh' ? f.label_zh : f.label_en }}</button>
								</div>
								<div class="publish-grid compact-form">
									<label>{{ t('featureKey') }}<input v-model.trim="featureDraft.key" :disabled="!featureIsNew"></label>
									<label>{{ t('displayOrder') }}<input v-model.number="featureDraft.display_order" type="number"></label>
									<label>{{ t('featureLabelZH') }}<input v-model="featureDraft.label_zh"></label>
									<label>{{ t('featureLabelEN') }}<input v-model="featureDraft.label_en"></label>
									<label class="wide">{{ t('featureDescriptionZH') }}<textarea v-model="featureDraft.description_zh"></textarea></label>
									<label class="wide">{{ t('featureDescriptionEN') }}<textarea v-model="featureDraft.description_en"></textarea></label>
									<div class="actions wide"><button class="primary" @click="addFeature">{{ featureIsNew ? t('addFeature') : t('editFeature') }}</button></div>
								</div>
							</div>

							<details class="panel ai-import">
								<summary>{{ t('aiImport') }}</summary>
								<p class="hint">{{ t('aiImportHint') }}</p>
								<textarea v-model="aiImportJSON" spellcheck="false" placeholder='{"board":{"id":"...","name_zh":"...","name_en":"...","status":"draft"},"features":[],"assignments":{"aprs":{"state":"yes"}}}'></textarea>
								<button class="primary" @click="importCatalog">{{ t('importCatalog') }}</button>
							</details>
							<p v-if="boardMessage" class="message catalog-message" aria-live="polite">{{ boardMessage }}</p>
						</div>
					</div>
				</section>

        <!-- Publish firmware -->
        <section v-else-if="view === 'publish'" class="view">
          <div class="view-head"><h1>{{ t('publishHeading') }}</h1></div>
          <div class="panel">
            <div class="publish-grid">
								<label>{{ t('boardType') }}<select v-model="board"><option v-for="b in uploadBoards" :key="b.id" :value="b.id">{{ b.name }}</option></select></label>
              <label>{{ t('firmwareVersion') }}<input v-model="version" :placeholder="t('firmwareVersion')"><span v-if="latestByBoard[board]" class="hint-sm">{{ t('currentLatest', { version: latestByBoard[board] }) }}</span></label>
              <label>{{ t('channel') }}<select v-model="channel"><option value="stable">{{ t('stable') }}</option><option value="beta">{{ t('beta') }}</option></select></label>
              <label>{{ t('firmwareFile') }}<input ref="firmware" type="file" accept=".bin"></label>
              <label class="wide">{{ t('releaseNotes') }}<textarea v-model="notes" :placeholder="t('releaseNotes')"></textarea></label>
              <div class="actions wide">
                <button class="primary" :disabled="publishPercent !== null" @click="upload">{{ t('publish') }}</button>
                <div v-if="publishPercent !== null" class="progress"><div class="progress-track"><div class="progress-bar" :style="{ width: publishPercent + '%' }"></div></div><span class="muted-sm">{{ publishPercent }}%</span></div>
                <span class="message" aria-live="polite">{{ publishMessage }}</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer class="app-footer">{{ t('brandName') }} · {{ t('subtitle') }}</footer>
    </div>`,
});

// Inline stroke icons keep the UI dependency-free; usage: <icon name="home" />.
const iconPaths = {
  radio:
    '<circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/><path d="M7.5 7.5a6.4 6.4 0 0 0 0 9"/><path d="M16.5 7.5a6.4 6.4 0 0 1 0 9"/><path d="M4.5 4.5a10.6 10.6 0 0 0 0 15"/><path d="M19.5 4.5a10.6 10.6 0 0 1 0 15"/>',
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="10" y="10" width="4" height="4"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/>',
  terminal: '<path d="m4 17 6-6-6-6"/><path d="M12 19h8"/>',
  server:
    '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  upload: '<path d="M12 16V4"/><path d="m6 10 6-6 6 6"/><path d="M4 20h16"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-5.5 8-5.5s6.5 1.5 8 5.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  check: '<path d="m4 12.5 5 5L20 6.5"/>',
};
app.component("icon", {
  props: { name: { type: String, required: true } },
  computed: {
    path() {
      return iconPaths[this.name] || "";
    },
  },
  template: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="path"></svg>`,
});

// <esp-web-install-button> is a custom element defined by esp-web-tools; tell the
// Vue template compiler not to treat it as a Vue component.
app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith("esp-web-");
app.mount("#app");
