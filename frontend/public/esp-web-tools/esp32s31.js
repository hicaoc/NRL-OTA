import { ESP32C5ROM } from './esp32c5.js?v=4';
import './esp32c6.js?v=4';
import './esp32c3.js?v=4';
import './esp32.js?v=4';
import './install-dialog.js?v=4';
import './styles.js?v=4';

class ESP32S31ROM extends ESP32C5ROM {
  constructor() {
    super(...arguments);
    this.CHIP_NAME = "ESP32-S31";
    this.IMAGE_CHIP_ID = 32;
    this.IROM_MAP_START = 0x40000000;
    this.IROM_MAP_END = 0x54000000;
    this.DROM_MAP_START = 0x40000000;
    this.DROM_MAP_END = 0x54000000;
    this.BOOTLOADER_FLASH_OFFSET = 0x2000;
    this.UART_DATE_REG_ADDR = 0x2038a08c;
    this.EFUSE_BASE = 0x20715000;
    this.EFUSE_BLOCK1_ADDR = this.EFUSE_BASE + 0x050;
    this.MAC_EFUSE_REG = this.EFUSE_BASE + 0x050;
    this.SPI_REG_BASE = 0x20501000;
    this.SPI_USR_OFFS = 0x18;
    this.SPI_USR1_OFFS = 0x1c;
    this.SPI_USR2_OFFS = 0x20;
    this.SPI_MOSI_DLEN_OFFS = 0x24;
    this.SPI_MISO_DLEN_OFFS = 0x28;
    this.SPI_W0_OFFS = 0x58;
    this.SPI_ADDR_REG_MSB = false;
    this.DR_REG_LP_WDT_BASE = 0x20801000;
    this.RTC_CNTL_WDTCONFIG0_REG = this.DR_REG_LP_WDT_BASE + 0x0;
    this.RTC_CNTL_WDTCONFIG1_REG = this.DR_REG_LP_WDT_BASE + 0x4;
    this.RTC_CNTL_WDTWPROTECT_REG = this.DR_REG_LP_WDT_BASE + 0x18;
    this.RTC_CNTL_WDT_WKEY = 0x50d83aa1;
    this.EFUSE_RD_REG_BASE = this.EFUSE_BASE + 0x030;
    this.EFUSE_PURPOSE_KEY0_REG = this.EFUSE_BASE + 0x38;
    this.EFUSE_PURPOSE_KEY0_SHIFT = 0;
    this.EFUSE_PURPOSE_KEY1_REG = this.EFUSE_BASE + 0x38;
    this.EFUSE_PURPOSE_KEY1_SHIFT = 5;
    this.EFUSE_PURPOSE_KEY2_REG = this.EFUSE_BASE + 0x38;
    this.EFUSE_PURPOSE_KEY2_SHIFT = 10;
    this.EFUSE_PURPOSE_KEY3_REG = this.EFUSE_BASE + 0x38;
    this.EFUSE_PURPOSE_KEY3_SHIFT = 15;
    this.EFUSE_PURPOSE_KEY4_REG = this.EFUSE_BASE + 0x38;
    this.EFUSE_PURPOSE_KEY4_SHIFT = 20;
    this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT_REG = this.EFUSE_RD_REG_BASE;
    this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT = 1 << 20;
    this.EFUSE_SPI_BOOT_CRYPT_CNT_REG = this.EFUSE_BASE + 0x034;
    this.EFUSE_SPI_BOOT_CRYPT_CNT_MASK = 0x7 << 21;
    this.EFUSE_SECURE_BOOT_EN_REG = this.EFUSE_BASE + 0x03c;
    this.EFUSE_SECURE_BOOT_EN_MASK = 1 << 2;
    this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_REG = this.EFUSE_BASE + 0x034;
    this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_SHIFT = 12;
    this.MEMORY_MAP = [[0x00000000, 0x00010000, "PADDING"], [0x40000000, 0x54000000, "DROM"], [0x2f000000, 0x2f080000, "DRAM"], [0x2f000000, 0x2f080000, "BYTE_ACCESSIBLE"], [0x2f800000, 0x2f850000, "DROM_MASK"], [0x2f800000, 0x2f850000, "IROM_MASK"], [0x40000000, 0x54000000, "IROM"], [0x2f000000, 0x2f080000, "IRAM"], [0x2e000000, 0x2e008000, "RTC_IRAM"], [0x2e000000, 0x2e008000, "RTC_DRAM"]];
    this.UF2_FAMILY_ID = 0x3101f7c1;
    this.USB_RAM_BLOCK = 0x800;
    this.EFUSE_MAX_KEY = 4;
    this.KEY_PURPOSES = {
      0: "USER/EMPTY",
      1: "ECDSA_KEY",
      2: "XTS_AES_256_KEY_1",
      3: "XTS_AES_256_KEY_2",
      4: "XTS_AES_128_KEY",
      5: "HMAC_DOWN_ALL",
      6: "HMAC_DOWN_JTAG",
      7: "HMAC_DOWN_DIGITAL_SIGNATURE",
      8: "HMAC_UP",
      9: "SECURE_BOOT_DIGEST0",
      10: "SECURE_BOOT_DIGEST1",
      11: "SECURE_BOOT_DIGEST2",
      12: "KM_INIT_KEY",
      13: "XTS_AES_256_PSRAM_KEY_1",
      14: "XTS_AES_256_PSRAM_KEY_2",
      15: "XTS_AES_128_PSRAM_KEY",
      16: "ECDSA_KEY_P192",
      17: "ECDSA_KEY_P384_L",
      18: "ECDSA_KEY_P384_H",
      19: "SDC_KEY_DIGEST"
    };
  }
  async getPkgVersion(loader) {
    const numWord = 4; // EFUSE_RD_MAC_SYS4_REG
    return (await loader.readReg(this.EFUSE_BLOCK1_ADDR + 4 * numWord)) >> 6 & 0x03;
  }
  async getMinorChipVersion(loader) {
    const numWord = 3; // EFUSE_RD_MAC_SYS3_REG
    return (await loader.readReg(this.EFUSE_BLOCK1_ADDR + 4 * numWord)) >> 18 & 0x0f;
  }
  async getMajorChipVersion(loader) {
    const numWord = 3; // EFUSE_RD_MAC_SYS3_REG
    return (await loader.readReg(this.EFUSE_BLOCK1_ADDR + 4 * numWord)) >> 22 & 0x03;
  }
  async getChipDescription(loader) {
    const pkgVer = await this.getPkgVersion(loader);
    const chipName = {
      0: "ESP32-S31"
    };
    const desc = chipName[pkgVer] || "unknown ESP32-S31";
    const majorRev = await this.getMajorChipVersion(loader);
    const minorRev = await this.getMinorChipVersion(loader);
    return `${desc} (revision v${majorRev}.${minorRev})`;
  }
  async getChipFeatures(loader) {
    return ["Wi-Fi 6", "BT 5.4 (LE)", "IEEE802.15.4", "Dual Core + LP Core", "300MHz"];
  }
  async getCrystalFreq(loader) {
    // ESP32-S31 XTAL is fixed to 40MHz
    return 40;
  }
  _d2h(d) {
    const h = (+d).toString(16);
    return h.length === 1 ? "0" + h : h;
  }
  async readMac(loader) {
    let mac0 = await loader.readReg(this.MAC_EFUSE_REG);
    mac0 = mac0 >>> 0;
    let mac1 = await loader.readReg(this.MAC_EFUSE_REG + 4);
    mac1 = mac1 >>> 0 & 0x0000ffff;
    const mac = new Uint8Array(6);
    mac[0] = mac1 >> 8 & 0xff;
    mac[1] = mac1 & 0xff;
    mac[2] = mac0 >> 24 & 0xff;
    mac[3] = mac0 >> 16 & 0xff;
    mac[4] = mac0 >> 8 & 0xff;
    mac[5] = mac0 & 0xff;
    return this._d2h(mac[0]) + ":" + this._d2h(mac[1]) + ":" + this._d2h(mac[2]) + ":" + this._d2h(mac[3]) + ":" + this._d2h(mac[4]) + ":" + this._d2h(mac[5]);
  }
  async postConnect(loader) {
    // If using USB-OTG, reduce RAM block size
    const bufNo = (await loader.readReg(this.UARTDEV_BUF_NO)) & 0xff;
    if (bufNo === 3) {
      loader.ESP_RAM_BLOCK = this.USB_RAM_BLOCK;
    }
  }
  getEraseSize(offset, size) {
    return size;
  }
}

export { ESP32S31ROM };
