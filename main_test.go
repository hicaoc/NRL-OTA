package main

import (
	"bytes"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	_ "modernc.org/sqlite"
)

func TestUploadPackageUpgradesMatchingAppOnlyRelease(t *testing.T) {
	dataDir := t.TempDir()
	firmwareDir := filepath.Join(dataDir, "firmware")
	packagesDir := filepath.Join(dataDir, "packages")
	if err := os.MkdirAll(firmwareDir, 0750); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(packagesDir, 0750); err != nil {
		t.Fatal(err)
	}
	db, err := sql.Open("sqlite", filepath.Join(dataDir, "test.sqlite3"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err = initDB(db); err != nil {
		t.Fatal(err)
	}

	app := []byte("matching application image")
	digest := sha256.Sum256(app)
	appSHA := hex.EncodeToString(digest[:])
	oldName := "gezipai-0.6.0-old.bin"
	if err = os.WriteFile(filepath.Join(firmwareDir, oldName), app, 0640); err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec(`INSERT INTO releases(board_type,version,channel,filename,sha256,size,notes,created_at,url) VALUES(?,?,?,?,?,?,?,?,?)`,
		"gezipai", "0.6.0", "stable", oldName, appSHA, len(app), "app only", 1, "/firmware/"+oldName); err != nil {
		t.Fatal(err)
	}

	s := &server{db: db, firmwareDir: firmwareDir, packagesDir: packagesDir, adminToken: "admin"}
	meta := packageMeta{
		Board: "gezipai", Version: "0.6.0", Channel: "stable", Notes: "complete",
		ChipFamily: "ESP32-S3", AppOffset: 0x10000,
		Parts: []packagePart{
			{Offset: 0, Name: "bootloader.bin"},
			{Offset: 0x10000, Name: "nrl-esp32.bin"},
		},
	}
	request := packageRequest(t, meta, map[string][]byte{
		"bootloader.bin": []byte("bootloader"),
		"nrl-esp32.bin":  app,
	})
	recorder := httptest.NewRecorder()
	s.uploadPackage(recorder, request)
	if recorder.Code != http.StatusCreated {
		t.Fatalf("status = %d, body = %s", recorder.Code, recorder.Body.String())
	}

	var gotURL, gotSHA string
	if err = db.QueryRow(`SELECT url,sha256 FROM releases WHERE board_type=? AND version=? AND channel=?`,
		"gezipai", "0.6.0", "stable").Scan(&gotURL, &gotSHA); err != nil {
		t.Fatal(err)
	}
	if want := "/packages/gezipai/0.6.0/nrl-esp32.bin"; gotURL != want {
		t.Fatalf("url = %q, want %q", gotURL, want)
	}
	if gotSHA != appSHA {
		t.Fatalf("sha256 = %q, want %q", gotSHA, appSHA)
	}
	if _, err = os.Stat(filepath.Join(packagesDir, "gezipai", "0.6.0", "package.json")); err != nil {
		t.Fatalf("package metadata was not stored: %v", err)
	}
	if _, err = os.Stat(filepath.Join(firmwareDir, oldName)); !os.IsNotExist(err) {
		t.Fatalf("old app-only image still exists, stat error: %v", err)
	}
}

func TestCatalogSeedsExistingBoardsAndFeatures(t *testing.T) {
	db, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "catalog.sqlite3"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err = initDB(db); err != nil {
		t.Fatal(err)
	}
	s := &server{db: db}
	catalog, err := s.loadCatalog(false)
	if err != nil {
		t.Fatal(err)
	}
	if len(catalog.Boards) != 4 {
		t.Fatalf("published boards = %d, want 4", len(catalog.Boards))
	}
	if len(catalog.Features) < 30 {
		t.Fatalf("features = %d, want at least 30", len(catalog.Features))
	}
	if got := catalog.Boards[0].Features["aprs"]; got != "yes" {
		t.Fatalf("gezipai APRS state = %q, want yes", got)
	}
}

func TestMCPRequiresAdminAndListsTools(t *testing.T) {
	dataDir := t.TempDir()
	db, err := sql.Open("sqlite", filepath.Join(dataDir, "mcp.sqlite3"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err = initDB(db); err != nil {
		t.Fatal(err)
	}
	s := &server{db: db, adminToken: "admin", boardImagesDir: filepath.Join(dataDir, "images")}
	if err = os.MkdirAll(s.boardImagesDir, 0750); err != nil {
		t.Fatal(err)
	}
	handler := s.mcpHandler()
	body := `{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}`

	unauthorized := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/mcp", strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Accept", "application/json, text/event-stream")
	handler.ServeHTTP(unauthorized, request)
	if unauthorized.Code != http.StatusUnauthorized {
		t.Fatalf("unauthorized status = %d, want 401", unauthorized.Code)
	}

	authorized := httptest.NewRecorder()
	request = httptest.NewRequest(http.MethodPost, "/mcp", strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Accept", "application/json, text/event-stream")
	request.Header.Set("Authorization", "Bearer admin")
	request.Header.Set("MCP-Protocol-Version", "2025-11-25")
	handler.ServeHTTP(authorized, request)
	if authorized.Code != http.StatusOK {
		t.Fatalf("authorized status = %d, body = %s", authorized.Code, authorized.Body.String())
	}
	for _, tool := range []string{`catalog.list`, `board.publish`, `firmware.list`, `firmware.create_upload`, `firmware.get_status`, `firmware.publish`, `firmware.archive`, `firmware.restore`} {
		if !strings.Contains(authorized.Body.String(), tool) {
			t.Fatalf("MCP tool %s missing from response: %s", tool, authorized.Body.String())
		}
	}
}

func TestFirmwareMCPStagesPublishesArchivesAndRestoresPackage(t *testing.T) {
	dataDir := t.TempDir()
	db, err := sql.Open("sqlite", filepath.Join(dataDir, "firmware-mcp.sqlite3"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err = initDB(db); err != nil {
		t.Fatal(err)
	}
	s := &server{
		db:                 db,
		adminToken:         "admin",
		firmwareDir:        filepath.Join(dataDir, "firmware"),
		packagesDir:        filepath.Join(dataDir, "packages"),
		firmwareUploadsDir: filepath.Join(dataDir, "firmware-uploads"),
	}
	for _, dir := range []string{s.firmwareDir, s.packagesDir, s.firmwareUploadsDir} {
		if err = os.MkdirAll(dir, 0750); err != nil {
			t.Fatal(err)
		}
	}

	created, err := s.createFirmwareUpload(mcpFirmwareCreateUploadInput{
		Board: "gezipai", Version: "9.9.9", Channel: "stable", Notes: "reviewed release notes", TTLMinutes: 15,
	})
	if err != nil {
		t.Fatal(err)
	}
	if created.UploadToken == "" || created.UploadPath == "" || created.ExpiresAt <= 0 {
		t.Fatalf("incomplete upload session: %#v", created)
	}
	if _, err = s.createFirmwareUpload(mcpFirmwareCreateUploadInput{Board: "gezipai", Version: "9.9.9"}); err == nil || !strings.Contains(err.Error(), "active firmware upload") {
		t.Fatalf("duplicate active upload was not rejected: %v", err)
	}
	meta := packageMeta{
		Board: "gezipai", Version: "9.9.9", Channel: "stable", Notes: "untrusted upload notes",
		ChipFamily: "ESP32-S3", AppOffset: 0x10000,
		Parts: []packagePart{
			{Offset: 0, Name: "bootloader.bin"},
			{Offset: 0x10000, Name: "nrl-esp32.bin"},
		},
	}
	request := packageRequest(t, meta, map[string][]byte{
		"bootloader.bin": []byte("bootloader"),
		"nrl-esp32.bin":  []byte("application image"),
	})
	request.SetPathValue("id", created.UploadID)
	request.Header.Del("X-OTA-Token")
	request.Header.Set("Authorization", "Bearer "+created.UploadToken)
	recorder := httptest.NewRecorder()
	s.uploadFirmwareSession(recorder, request)
	if recorder.Code != http.StatusCreated {
		t.Fatalf("stage status = %d, body = %s", recorder.Code, recorder.Body.String())
	}

	status, err := s.firmwareUploadStatus(created.UploadID)
	if err != nil {
		t.Fatal(err)
	}
	if status.Status != "uploaded" || status.SHA256 == "" || status.PartCount != 2 {
		t.Fatalf("unexpected staged status: %#v", status)
	}
	if releases, err := s.releases("gezipai", "stable"); err != nil || len(releases) != 0 {
		t.Fatalf("staged firmware became device-visible: releases=%#v err=%v", releases, err)
	}
	stagedMeta, err := os.ReadFile(filepath.Join(s.firmwareUploadPath(created.UploadID), "package.json"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(stagedMeta), `"notes": "reviewed release notes"`) || strings.Contains(string(stagedMeta), "untrusted upload notes") {
		t.Fatalf("session release notes were not enforced: %s", stagedMeta)
	}

	published, err := s.publishFirmwareUpload(created.UploadID)
	if err != nil {
		t.Fatal(err)
	}
	if published.Status != "published" || published.SHA256 != status.SHA256 || !published.WebFlashable {
		t.Fatalf("unexpected publish result: %#v", published)
	}
	if _, err = os.Stat(filepath.Join(s.packageDir("gezipai", "9.9.9"), "package.json")); err != nil {
		t.Fatalf("published package missing: %v", err)
	}
	if again, err := s.publishFirmwareUpload(created.UploadID); err != nil || again.SHA256 != published.SHA256 {
		t.Fatalf("idempotent publish failed: result=%#v err=%v", again, err)
	}
	if releases, err := s.releases("gezipai", "stable"); err != nil || len(releases) != 1 {
		t.Fatalf("published firmware is not device-visible: releases=%#v err=%v", releases, err)
	}

	action := mcpFirmwareReleaseActionInput{Board: "gezipai", Version: "9.9.9", Channel: "stable", Confirm: true}
	if _, err = s.setFirmwareArchived(action, true, "mcp"); err != nil {
		t.Fatal(err)
	}
	if releases, err := s.releases("gezipai", "stable"); err != nil || len(releases) != 0 {
		t.Fatalf("archived firmware is still device-visible: releases=%#v err=%v", releases, err)
	}
	managed, err := s.managedReleases(mcpFirmwareListInput{Board: "gezipai", IncludeArchived: true})
	if err != nil || len(managed) != 1 || managed[0].ArchivedAt == 0 {
		t.Fatalf("archived firmware missing from administrator list: releases=%#v err=%v", managed, err)
	}
	if _, err = s.setFirmwareArchived(action, false, "mcp"); err != nil {
		t.Fatal(err)
	}
	if releases, err := s.releases("gezipai", "stable"); err != nil || len(releases) != 1 {
		t.Fatalf("restored firmware is not device-visible: releases=%#v err=%v", releases, err)
	}

	events, err := s.auditEvents(20)
	if err != nil {
		t.Fatal(err)
	}
	for _, expected := range []string{"firmware.create_upload", "firmware.upload", "firmware.publish", "firmware.archive", "firmware.restore"} {
		found := false
		for _, event := range events {
			if event.Action == expected {
				found = true
				break
			}
		}
		if !found {
			t.Fatalf("audit action %q missing: %#v", expected, events)
		}
	}
}

func TestFirmwareUploadTokenIsOneTimeAndSessionMetadataMustMatch(t *testing.T) {
	dataDir := t.TempDir()
	db, err := sql.Open("sqlite", filepath.Join(dataDir, "one-time.sqlite3"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err = initDB(db); err != nil {
		t.Fatal(err)
	}
	s := &server{
		db: db, packagesDir: filepath.Join(dataDir, "packages"), firmwareUploadsDir: filepath.Join(dataDir, "uploads"),
	}
	for _, dir := range []string{s.packagesDir, s.firmwareUploadsDir} {
		if err = os.MkdirAll(dir, 0750); err != nil {
			t.Fatal(err)
		}
	}
	created, err := s.createFirmwareUpload(mcpFirmwareCreateUploadInput{Board: "gezipai", Version: "1.2.3"})
	if err != nil {
		t.Fatal(err)
	}
	meta := packageMeta{
		Board: "bh4tdv", Version: "1.2.3", Channel: "stable", ChipFamily: "ESP32-S3", AppOffset: 0,
		Parts: []packagePart{{Offset: 0, Name: "app.bin"}},
	}
	request := packageRequest(t, meta, map[string][]byte{"app.bin": []byte("app")})
	request.SetPathValue("id", created.UploadID)
	request.Header.Set("Authorization", "Bearer "+created.UploadToken)
	recorder := httptest.NewRecorder()
	s.uploadFirmwareSession(recorder, request)
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("mismatched metadata status = %d, body = %s", recorder.Code, recorder.Body.String())
	}
	status, err := s.firmwareUploadStatus(created.UploadID)
	if err != nil || status.Status != "failed" {
		t.Fatalf("failed upload status = %#v, err=%v", status, err)
	}

	replay := packageRequest(t, meta, map[string][]byte{"app.bin": []byte("app")})
	replay.SetPathValue("id", created.UploadID)
	replay.Header.Set("Authorization", "Bearer "+created.UploadToken)
	recorder = httptest.NewRecorder()
	s.uploadFirmwareSession(recorder, replay)
	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("replayed token status = %d, want 401; body = %s", recorder.Code, recorder.Body.String())
	}
}

func TestAIImportCreatesDraftThenAdminPublishesCustomBoard(t *testing.T) {
	dataDir := t.TempDir()
	db, err := sql.Open("sqlite", filepath.Join(dataDir, "custom.sqlite3"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err = initDB(db); err != nil {
		t.Fatal(err)
	}
	s := &server{
		db:             db,
		adminToken:     "admin",
		boardImagesDir: filepath.Join(dataDir, "images"),
		firmwareDir:    filepath.Join(dataDir, "firmware"),
		packagesDir:    filepath.Join(dataDir, "packages"),
	}
	for _, dir := range []string{s.boardImagesDir, s.firmwareDir, s.packagesDir} {
		if err = os.MkdirAll(dir, 0750); err != nil {
			t.Fatal(err)
		}
	}
	importBody := `{
		"board":{"id":"custom_radio","name_zh":"自定义电台板","name_en":"Custom Radio Board","chip_label":"ESP32-S3","web_flash_chip_family":"ESP32-S3","status":"published","highlights_zh":["测试功能"],"highlights_en":["Test feature"]},
		"features":[{"key":"custom_feature","label_zh":"自定义功能","label_en":"Custom feature","group":"custom","display_order":900,"active":true}],
		"assignments":{"custom_feature":{"state":"partial","note_zh":"需要外接模块","note_en":"External module required"}}
	}`
	request := httptest.NewRequest(http.MethodPost, "/api/v1/admin/catalog/import", strings.NewReader(importBody))
	request.Header.Set("X-OTA-Token", "admin")
	recorder := httptest.NewRecorder()
	s.importCatalog(recorder, request)
	if recorder.Code != http.StatusOK {
		t.Fatalf("import status = %d, body = %s", recorder.Code, recorder.Body.String())
	}
	var status string
	if err = db.QueryRow(`SELECT status FROM boards WHERE id='custom_radio'`).Scan(&status); err != nil {
		t.Fatal(err)
	}
	if status != "draft" {
		t.Fatalf("AI import status = %q, want draft", status)
	}

	pngData, err := base64.StdEncoding.DecodeString("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = s.saveBoardImage("custom_radio", pngData); err != nil {
		t.Fatal(err)
	}
	request = httptest.NewRequest(http.MethodPut, "/api/v1/admin/boards/custom_radio/features", strings.NewReader(`{"features":{"custom_feature":{"state":"partial","note_zh":"页面限制","note_en":"Page limitation"}}}`))
	request.SetPathValue("id", "custom_radio")
	request.Header.Set("X-OTA-Token", "admin")
	recorder = httptest.NewRecorder()
	s.updateBoardFeatures(recorder, request)
	if recorder.Code != http.StatusOK {
		t.Fatalf("feature update status = %d, body = %s", recorder.Code, recorder.Body.String())
	}
	updateBody := `{"id":"custom_radio","name_zh":"自定义电台板","name_en":"Custom Radio Board","tagline_zh":"可扩展板卡","tagline_en":"Extensible board","chip_label":"ESP32-S3","web_flash_chip_family":"ESP32-S3","display_order":100,"status":"published","highlights_zh":["测试功能"],"highlights_en":["Test feature"]}`
	request = httptest.NewRequest(http.MethodPut, "/api/v1/admin/boards/custom_radio", strings.NewReader(updateBody))
	request.SetPathValue("id", "custom_radio")
	request.Header.Set("X-OTA-Token", "admin")
	recorder = httptest.NewRecorder()
	s.updateBoard(recorder, request)
	if recorder.Code != http.StatusOK {
		t.Fatalf("publish status = %d, body = %s", recorder.Code, recorder.Body.String())
	}
	catalog, err := s.loadCatalog(false)
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, board := range catalog.Boards {
		if board.ID == "custom_radio" {
			found = true
			if board.Features["custom_feature"] != "partial" || board.FeatureNotes["custom_feature"].ZH != "页面限制" {
				t.Fatalf("custom feature assignment was not preserved: %#v %#v", board.Features, board.FeatureNotes)
			}
			break
		}
	}
	if !found {
		t.Fatal("published custom board missing from public catalog")
	}
	events, err := s.auditEvents(10)
	if err != nil {
		t.Fatal(err)
	}
	if len(events) < 2 || events[0].Target != "custom_radio" {
		t.Fatalf("custom board audit trail missing: %#v", events)
	}
}

func TestCheckDeviceRecordsRealClientIPBehindProxy(t *testing.T) {
	db, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "devices.sqlite3"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err = initDB(db); err != nil {
		t.Fatal(err)
	}
	s := &server{db: db}
	recordedIP := func() string {
		t.Helper()
		var ip string
		if err := db.QueryRow(`SELECT ip_address FROM devices WHERE device_id='AA:BB:CC:DD:EE:FF'`).Scan(&ip); err != nil {
			t.Fatal(err)
		}
		return ip
	}
	check := func(remoteAddr, xff string) {
		t.Helper()
		body := `{"device_id":"AA:BB:CC:DD:EE:FF","board_type":"gezipai","firmware_version":"0.6.0"}`
		request := httptest.NewRequest(http.MethodPost, "/api/v1/device/check", strings.NewReader(body))
		request.RemoteAddr = remoteAddr
		if xff != "" {
			request.Header.Set("X-Forwarded-For", xff)
		}
		recorder := httptest.NewRecorder()
		s.checkDevice(recorder, request)
		if recorder.Code != http.StatusOK {
			t.Fatalf("check status = %d, body = %s", recorder.Code, recorder.Body.String())
		}
	}

	// Behind a loopback reverse proxy the forwarded header wins.
	check("127.0.0.1:54321", "203.0.113.9, 10.0.0.1")
	if ip := recordedIP(); ip != "203.0.113.9" {
		t.Fatalf("proxied ip_address = %q, want 203.0.113.9", ip)
	}

	// A direct non-loopback peer can spoof the header, so it is ignored.
	check("192.0.2.1:1234", "203.0.113.9")
	if ip := recordedIP(); ip != "192.0.2.1" {
		t.Fatalf("direct ip_address = %q, want 192.0.2.1", ip)
	}

	// A loopback peer without proxy headers (local development) keeps RemoteAddr.
	check("[::1]:8080", "")
	if ip := recordedIP(); ip != "::1" {
		t.Fatalf("loopback ip_address = %q, want ::1", ip)
	}
}

func TestAdminReleaseArchiveRestoreFlow(t *testing.T) {
	dataDir := t.TempDir()
	firmwareDir := filepath.Join(dataDir, "firmware")
	if err := os.MkdirAll(firmwareDir, 0750); err != nil {
		t.Fatal(err)
	}
	db, err := sql.Open("sqlite", filepath.Join(dataDir, "releases.sqlite3"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err = initDB(db); err != nil {
		t.Fatal(err)
	}
	name := "gezipai-1.0.0.bin"
	if err = os.WriteFile(filepath.Join(firmwareDir, name), []byte("image"), 0640); err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec(`INSERT INTO releases(board_type,version,channel,filename,sha256,size,notes,created_at,url) VALUES(?,?,?,?,?,?,?,?,?)`,
		"gezipai", "1.0.0", "stable", name, "sha", 5, "notes", 1, "/firmware/"+name); err != nil {
		t.Fatal(err)
	}
	s := &server{db: db, firmwareDir: firmwareDir, adminToken: "admin"}

	countPublic := func() int {
		t.Helper()
		releases, err := s.releases("gezipai", "")
		if err != nil {
			t.Fatal(err)
		}
		return len(releases)
	}
	act := func(path, token string) *httptest.ResponseRecorder {
		t.Helper()
		body := `{"board":"gezipai","version":"1.0.0","channel":"stable"}`
		request := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
		if token != "" {
			request.Header.Set("X-OTA-Token", token)
		}
		recorder := httptest.NewRecorder()
		if strings.HasSuffix(path, "archive") {
			s.archiveRelease(recorder, request)
		} else {
			s.restoreRelease(recorder, request)
		}
		return recorder
	}

	// Archiving requires admin authorization.
	if recorder := act("/api/v1/admin/releases/archive", ""); recorder.Code != http.StatusUnauthorized {
		t.Fatalf("unauthorized archive status = %d, want 401", recorder.Code)
	}
	if countPublic() != 1 {
		t.Fatal("unauthorized archive hid the release")
	}

	// Archive hides the release from devices and the public history.
	if recorder := act("/api/v1/admin/releases/archive", "admin"); recorder.Code != http.StatusOK {
		t.Fatalf("archive status = %d, body = %s", recorder.Code, recorder.Body.String())
	}
	if countPublic() != 0 {
		t.Fatal("archived release is still public")
	}
	managed, err := s.managedReleases(mcpFirmwareListInput{Board: "gezipai", IncludeArchived: true})
	if err != nil || len(managed) != 1 || managed[0].ArchivedAt == 0 {
		t.Fatalf("archived release missing from admin list: %#v err=%v", managed, err)
	}

	// Restore makes it visible again.
	if recorder := act("/api/v1/admin/releases/restore", "admin"); recorder.Code != http.StatusOK {
		t.Fatalf("restore status = %d, body = %s", recorder.Code, recorder.Body.String())
	}
	if countPublic() != 1 {
		t.Fatal("restored release is not public")
	}

	// The admin HTTP list endpoint includes archived rows.
	request := httptest.NewRequest(http.MethodGet, "/api/v1/admin/releases?board=gezipai", nil)
	request.Header.Set("X-OTA-Token", "admin")
	recorder := httptest.NewRecorder()
	s.adminListReleases(recorder, request)
	if recorder.Code != http.StatusOK || !strings.Contains(recorder.Body.String(), `"version":"1.0.0"`) {
		t.Fatalf("admin list status = %d, body = %s", recorder.Code, recorder.Body.String())
	}
}

func packageRequest(t *testing.T, meta packageMeta, files map[string][]byte) *http.Request {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	metaField, err := writer.CreateFormField("meta")
	if err != nil {
		t.Fatal(err)
	}
	if err = json.NewEncoder(metaField).Encode(meta); err != nil {
		t.Fatal(err)
	}
	for _, part := range meta.Parts {
		field, err := writer.CreateFormFile(part.Name, part.Name)
		if err != nil {
			t.Fatal(err)
		}
		if _, err = field.Write(files[part.Name]); err != nil {
			t.Fatal(err)
		}
	}
	if err = writer.Close(); err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodPost, "/api/v1/admin/flash-package", &body)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	request.Header.Set("X-OTA-Token", "admin")
	return request
}
