package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

const (
	defaultFirmwareUploadTTL = 30 * time.Minute
	maxFirmwareUploadTTL     = 2 * time.Hour
	maxFirmwarePackageSize   = 64 << 20
	maxFirmwarePartSize      = 32 << 20
	maxFirmwareParts         = 32
)

type firmwareUploadSession struct {
	ID          string `json:"id"`
	TokenHash   string `json:"-"`
	Board       string `json:"board"`
	Version     string `json:"version"`
	Channel     string `json:"channel"`
	Notes       string `json:"notes"`
	Status      string `json:"status"`
	AppName     string `json:"app_name,omitempty"`
	SHA256      string `json:"sha256,omitempty"`
	Size        int64  `json:"size,omitempty"`
	PartCount   int    `json:"part_count,omitempty"`
	Error       string `json:"error,omitempty"`
	CreatedAt   int64  `json:"created_at"`
	ExpiresAt   int64  `json:"expires_at"`
	UpdatedAt   int64  `json:"updated_at"`
	PublishedAt int64  `json:"published_at,omitempty"`
}

type mcpFirmwareCreateUploadInput struct {
	Board      string `json:"board" jsonschema:"registered board identifier"`
	Version    string `json:"version" jsonschema:"immutable firmware version identifier"`
	Channel    string `json:"channel,omitempty" jsonschema:"stable or beta; defaults to stable"`
	Notes      string `json:"notes,omitempty" jsonschema:"release notes fixed for this upload session"`
	TTLMinutes int    `json:"ttl_minutes,omitempty" jsonschema:"one-time upload lifetime in minutes, 5 to 120; defaults to 30"`
}

type mcpFirmwareCreateUploadOutput struct {
	UploadID     string            `json:"upload_id"`
	UploadPath   string            `json:"upload_path"`
	UploadMethod string            `json:"upload_method"`
	UploadToken  string            `json:"upload_token"`
	Headers      map[string]string `json:"headers"`
	ExpiresAt    int64             `json:"expires_at"`
	Instructions string            `json:"instructions"`
}

type mcpFirmwareListInput struct {
	Board           string `json:"board" jsonschema:"registered board identifier"`
	Channel         string `json:"channel,omitempty" jsonschema:"stable, beta, or empty for both"`
	IncludeArchived bool   `json:"include_archived,omitempty" jsonschema:"include releases hidden from devices and the public catalog"`
}

type managedRelease struct {
	Version    string `json:"version"`
	Channel    string `json:"channel"`
	URL        string `json:"url"`
	SHA256     string `json:"sha256"`
	Notes      string `json:"notes"`
	Size       int64  `json:"size"`
	CreatedAt  int64  `json:"created_at"`
	ArchivedAt int64  `json:"archived_at,omitempty"`
}

type mcpFirmwareListOutput struct {
	Board    string           `json:"board"`
	Releases []managedRelease `json:"releases"`
}

type mcpFirmwareUploadIDInput struct {
	UploadID string `json:"upload_id" jsonschema:"identifier returned by firmware.create_upload"`
	Confirm  bool   `json:"confirm,omitempty" jsonschema:"must be true when publishing a staged upload"`
}

type mcpFirmwareUploadStatusInput struct {
	UploadID string `json:"upload_id" jsonschema:"identifier returned by firmware.create_upload"`
}

type mcpFirmwareStatusOutput struct {
	Upload firmwareUploadSession `json:"upload"`
}

type firmwarePublishOutput struct {
	UploadID     string `json:"upload_id"`
	Board        string `json:"board"`
	Version      string `json:"version"`
	Channel      string `json:"channel"`
	Status       string `json:"status"`
	AppURL       string `json:"app_url"`
	SHA256       string `json:"sha256"`
	Size         int64  `json:"size"`
	PartCount    int    `json:"part_count"`
	WebFlashable bool   `json:"web_flashable"`
}

type mcpFirmwareReleaseActionInput struct {
	Board   string `json:"board" jsonschema:"registered board identifier"`
	Version string `json:"version" jsonschema:"published firmware version"`
	Channel string `json:"channel,omitempty" jsonschema:"stable or beta; defaults to stable"`
	Confirm bool   `json:"confirm" jsonschema:"must be true because this changes device-visible releases"`
}

func (s *server) registerFirmwareMCPTools(ms *mcp.Server) {
	mcp.AddTool(ms, &mcp.Tool{
		Name:        "firmware.list",
		Title:       "List firmware releases",
		Description: "List active or archived firmware releases for a board. Use include_archived only for administrator review.",
	}, func(_ context.Context, _ *mcp.CallToolRequest, input mcpFirmwareListInput) (*mcp.CallToolResult, mcpFirmwareListOutput, error) {
		releases, err := s.managedReleases(input)
		return nil, mcpFirmwareListOutput{Board: input.Board, Releases: releases}, err
	})

	mcp.AddTool(ms, &mcp.Tool{
		Name:        "firmware.create_upload",
		Title:       "Create one-time firmware upload",
		Description: "Create a short-lived one-time HTTP upload path and bearer token. Upload the complete flash package as multipart form data; do not put firmware bytes in MCP JSON. The upload is staged and is not device-visible until firmware.publish is called with confirm=true.",
	}, func(_ context.Context, _ *mcp.CallToolRequest, input mcpFirmwareCreateUploadInput) (*mcp.CallToolResult, mcpFirmwareCreateUploadOutput, error) {
		output, err := s.createFirmwareUpload(input)
		return nil, output, err
	})

	mcp.AddTool(ms, &mcp.Tool{
		Name:        "firmware.get_status",
		Title:       "Get firmware upload status",
		Description: "Inspect a one-time upload session. Status progresses through pending, uploading, uploaded, and published; failed or expired sessions require a new upload session.",
	}, func(_ context.Context, _ *mcp.CallToolRequest, input mcpFirmwareUploadStatusInput) (*mcp.CallToolResult, mcpFirmwareStatusOutput, error) {
		upload, err := s.firmwareUploadStatus(input.UploadID)
		return nil, mcpFirmwareStatusOutput{Upload: upload}, err
	})

	mcp.AddTool(ms, &mcp.Tool{
		Name:        "firmware.publish",
		Title:       "Publish staged firmware",
		Description: "Verify and publish a successfully uploaded complete flash package. Requires confirm=true. Publishing is idempotent and records an audit event.",
	}, func(_ context.Context, _ *mcp.CallToolRequest, input mcpFirmwareUploadIDInput) (*mcp.CallToolResult, firmwarePublishOutput, error) {
		if !input.Confirm {
			return nil, firmwarePublishOutput{}, errors.New("confirm must be true")
		}
		output, err := s.publishFirmwareUpload(input.UploadID)
		return nil, output, err
	})

	mcp.AddTool(ms, &mcp.Tool{
		Name:        "firmware.archive",
		Title:       "Archive a firmware release",
		Description: "Hide a firmware release from devices, public history, and generated web-flash manifests without deleting its files. Requires confirm=true.",
	}, func(_ context.Context, _ *mcp.CallToolRequest, input mcpFirmwareReleaseActionInput) (*mcp.CallToolResult, mcpMutationOutput, error) {
		output, err := s.setFirmwareArchived(input, true, "mcp")
		return nil, output, err
	})

	mcp.AddTool(ms, &mcp.Tool{
		Name:        "firmware.restore",
		Title:       "Restore an archived firmware release",
		Description: "Make an archived firmware release visible to devices and public history again. Requires confirm=true.",
	}, func(_ context.Context, _ *mcp.CallToolRequest, input mcpFirmwareReleaseActionInput) (*mcp.CallToolResult, mcpMutationOutput, error) {
		output, err := s.setFirmwareArchived(input, false, "mcp")
		return nil, output, err
	})
}

func (s *server) firmwareUploadRoot() string {
	if s.firmwareUploadsDir != "" {
		return s.firmwareUploadsDir
	}
	if s.packagesDir != "" {
		return filepath.Join(filepath.Dir(s.packagesDir), "firmware-uploads")
	}
	return filepath.Join(os.TempDir(), "nrl-ota-firmware-uploads")
}

func (s *server) firmwareUploadPath(id string) string {
	return filepath.Join(s.firmwareUploadRoot(), id)
}

func randomHex(bytes int) (string, error) {
	data := make([]byte, bytes)
	if _, err := rand.Read(data); err != nil {
		return "", err
	}
	return hex.EncodeToString(data), nil
}

func hashUploadToken(token string) string {
	digest := sha256.Sum256([]byte(token))
	return hex.EncodeToString(digest[:])
}

func (s *server) createFirmwareUpload(input mcpFirmwareCreateUploadInput) (mcpFirmwareCreateUploadOutput, error) {
	input.Board = strings.TrimSpace(input.Board)
	input.Version = strings.TrimSpace(input.Version)
	input.Channel = strings.TrimSpace(input.Channel)
	if input.Channel == "" {
		input.Channel = "stable"
	}
	if !validName.MatchString(input.Board) || !validName.MatchString(input.Version) || (input.Channel != "stable" && input.Channel != "beta") {
		return mcpFirmwareCreateUploadOutput{}, errors.New("invalid board, version or channel")
	}
	if !s.boardExists(input.Board) {
		return mcpFirmwareCreateUploadOutput{}, errors.New("board is not registered")
	}
	if len(input.Notes) > 16<<10 {
		return mcpFirmwareCreateUploadOutput{}, errors.New("release notes exceed 16 KB")
	}
	ttl := defaultFirmwareUploadTTL
	if input.TTLMinutes != 0 {
		ttl = time.Duration(input.TTLMinutes) * time.Minute
	}
	if ttl < 5*time.Minute || ttl > maxFirmwareUploadTTL {
		return mcpFirmwareCreateUploadOutput{}, errors.New("ttl_minutes must be between 5 and 120")
	}
	if err := os.MkdirAll(s.firmwareUploadRoot(), 0750); err != nil {
		return mcpFirmwareCreateUploadOutput{}, err
	}
	s.cleanupExpiredFirmwareUploads()
	var existingURL string
	if err := s.db.QueryRow(`SELECT url FROM releases WHERE board_type=? AND version=? AND channel=?`, input.Board, input.Version, input.Channel).Scan(&existingURL); err == nil && strings.HasPrefix(existingURL, "/packages/") {
		return mcpFirmwareCreateUploadOutput{}, errors.New("complete package already exists")
	} else if err != nil && err != sql.ErrNoRows {
		return mcpFirmwareCreateUploadOutput{}, err
	}
	var activeUploadID string
	if err := s.db.QueryRow(`SELECT id FROM firmware_uploads WHERE board_type=? AND version=? AND channel=? AND status IN ('pending','uploading','uploaded') AND expires_at>=? LIMIT 1`,
		input.Board, input.Version, input.Channel, time.Now().Unix()).Scan(&activeUploadID); err == nil {
		return mcpFirmwareCreateUploadOutput{}, fmt.Errorf("active firmware upload already exists: %s", activeUploadID)
	} else if err != nil && err != sql.ErrNoRows {
		return mcpFirmwareCreateUploadOutput{}, err
	}
	id, err := randomHex(16)
	if err != nil {
		return mcpFirmwareCreateUploadOutput{}, err
	}
	token, err := randomHex(32)
	if err != nil {
		return mcpFirmwareCreateUploadOutput{}, err
	}
	now := time.Now()
	expires := now.Add(ttl)
	_, err = s.db.Exec(`INSERT INTO firmware_uploads(id,token_hash,board_type,version,channel,notes,status,created_at,expires_at,updated_at) VALUES(?,?,?,?,?,?,'pending',?,?,?)`,
		id, hashUploadToken(token), input.Board, input.Version, input.Channel, input.Notes, now.Unix(), expires.Unix(), now.Unix())
	if err != nil {
		return mcpFirmwareCreateUploadOutput{}, err
	}
	s.recordAudit("mcp", "firmware.create_upload", id, map[string]any{
		"board": input.Board, "version": input.Version, "channel": input.Channel, "expires_at": expires.Unix(),
	})
	return mcpFirmwareCreateUploadOutput{
		UploadID:     id,
		UploadPath:   s.publicPath("/api/v1/admin/firmware-uploads/" + id),
		UploadMethod: http.MethodPost,
		UploadToken:  token,
		Headers:      map[string]string{"Authorization": "Bearer " + token},
		ExpiresAt:    expires.Unix(),
		Instructions: "Send multipart/form-data with a meta JSON field and one file field per package part. Each file field name and filename must equal the corresponding meta.parts[].name. Then call firmware.get_status and firmware.publish with confirm=true.",
	}, nil
}

func (s *server) getFirmwareUpload(id string) (firmwareUploadSession, error) {
	var upload firmwareUploadSession
	if !validName.MatchString(id) {
		return upload, errors.New("invalid upload_id")
	}
	err := s.db.QueryRow(`SELECT id,token_hash,board_type,version,channel,notes,status,app_name,sha256,size,part_count,error,created_at,expires_at,updated_at,published_at FROM firmware_uploads WHERE id=?`, id).Scan(
		&upload.ID, &upload.TokenHash, &upload.Board, &upload.Version, &upload.Channel, &upload.Notes, &upload.Status,
		&upload.AppName, &upload.SHA256, &upload.Size, &upload.PartCount, &upload.Error,
		&upload.CreatedAt, &upload.ExpiresAt, &upload.UpdatedAt, &upload.PublishedAt)
	if err == sql.ErrNoRows {
		return upload, errors.New("firmware upload not found")
	}
	return upload, err
}

func (s *server) firmwareUploadStatus(id string) (firmwareUploadSession, error) {
	upload, err := s.getFirmwareUpload(id)
	if err != nil {
		return upload, err
	}
	if upload.ExpiresAt < time.Now().Unix() && upload.Status != "published" && upload.Status != "expired" && upload.Status != "failed" {
		s.expireFirmwareUpload(upload.ID)
		upload, err = s.getFirmwareUpload(id)
	}
	return upload, err
}

func (s *server) cleanupExpiredFirmwareUploads() {
	now := time.Now().Unix()
	rows, err := s.db.Query(`SELECT id FROM firmware_uploads WHERE expires_at<? AND status IN ('pending','uploading','uploaded')`, now)
	if err != nil {
		return
	}
	var ids []string
	for rows.Next() {
		var id string
		if rows.Scan(&id) == nil {
			ids = append(ids, id)
		}
	}
	rows.Close()
	for _, id := range ids {
		s.expireFirmwareUpload(id)
	}
}

func (s *server) expireFirmwareUpload(id string) {
	now := time.Now().Unix()
	result, err := s.db.Exec(`UPDATE firmware_uploads SET status='expired',token_hash='',error='upload session expired',updated_at=? WHERE id=? AND status IN ('pending','uploading','uploaded')`, now, id)
	if err != nil {
		return
	}
	if affected, _ := result.RowsAffected(); affected > 0 {
		_ = os.RemoveAll(s.firmwareUploadPath(id))
		s.recordAudit("system", "firmware.upload_expired", id, map[string]any{})
	}
}

func (s *server) uploadFirmwareSession(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	upload, err := s.getFirmwareUpload(id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	if time.Now().Unix() > upload.ExpiresAt {
		s.expireFirmwareUpload(id)
		writeError(w, http.StatusGone, "firmware upload session expired")
		return
	}
	presented := r.Header.Get("X-OTA-Upload-Token")
	if presented == "" {
		presented = strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	}
	presentedHash := hashUploadToken(presented)
	if presented == "" || subtle.ConstantTimeCompare([]byte(presentedHash), []byte(upload.TokenHash)) != 1 {
		writeError(w, http.StatusUnauthorized, "invalid firmware upload token")
		return
	}
	now := time.Now().Unix()
	result, err := s.db.Exec(`UPDATE firmware_uploads SET status='uploading',updated_at=? WHERE id=? AND status='pending'`, now, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if affected, _ := result.RowsAffected(); affected != 1 {
		writeError(w, http.StatusConflict, "firmware upload token was already used")
		return
	}
	dir := s.firmwareUploadPath(id)
	_ = os.RemoveAll(dir)
	if err = os.MkdirAll(dir, 0750); err != nil {
		s.failFirmwareUpload(id, err)
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxFirmwarePackageSize)
	meta, appName, appSHA, appSize, requestErr := s.receiveStagedFirmwarePackage(r, dir, upload)
	if requestErr != nil {
		_ = os.RemoveAll(dir)
		s.failFirmwareUpload(id, requestErr)
		writeError(w, requestErr.Status, requestErr.Message)
		return
	}
	now = time.Now().Unix()
	_, err = s.db.Exec(`UPDATE firmware_uploads SET status='uploaded',token_hash='',app_name=?,sha256=?,size=?,part_count=?,error='',updated_at=? WHERE id=? AND status='uploading'`,
		appName, appSHA, appSize, len(meta.Parts), now, id)
	if err != nil {
		_ = os.RemoveAll(dir)
		s.failFirmwareUpload(id, err)
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	s.recordAudit("upload", "firmware.upload", id, map[string]any{
		"board": meta.Board, "version": meta.Version, "channel": meta.Channel, "sha256": appSHA, "size": appSize, "parts": len(meta.Parts),
	})
	writeJSON(w, http.StatusCreated, map[string]any{
		"upload_id": id, "status": "uploaded", "board": meta.Board, "version": meta.Version,
		"channel": meta.Channel, "sha256": appSHA, "size": appSize, "parts": len(meta.Parts),
	})
}

type firmwareUploadHTTPError struct {
	Status  int
	Message string
}

func (e *firmwareUploadHTTPError) Error() string { return e.Message }

func firmwareUploadError(status int, message string) *firmwareUploadHTTPError {
	return &firmwareUploadHTTPError{Status: status, Message: message}
}

func (s *server) receiveStagedFirmwarePackage(r *http.Request, dir string, expected firmwareUploadSession) (packageMeta, string, string, int64, *firmwareUploadHTTPError) {
	if err := r.ParseMultipartForm(8 << 20); err != nil {
		return packageMeta{}, "", "", 0, firmwareUploadError(http.StatusBadRequest, "invalid multipart upload: "+err.Error())
	}
	if r.MultipartForm != nil {
		defer r.MultipartForm.RemoveAll()
	}
	var meta packageMeta
	if err := json.Unmarshal([]byte(r.FormValue("meta")), &meta); err != nil {
		return meta, "", "", 0, firmwareUploadError(http.StatusBadRequest, "invalid meta field")
	}
	if meta.Channel == "" {
		meta.Channel = "stable"
	}
	meta.ChipFamily = canonicalChipFamily(meta.ChipFamily)
	if meta.Board != expected.Board || meta.Version != expected.Version || meta.Channel != expected.Channel {
		return meta, "", "", 0, firmwareUploadError(http.StatusBadRequest, "package metadata does not match the upload session")
	}
	meta.Notes = expected.Notes
	if len(meta.Parts) == 0 || len(meta.Parts) > maxFirmwareParts {
		return meta, "", "", 0, firmwareUploadError(http.StatusBadRequest, "package must contain between 1 and 32 parts")
	}
	if expectedFamily, ok := s.boardChipFamily(meta.Board); !ok || meta.ChipFamily != expectedFamily {
		return meta, "", "", 0, firmwareUploadError(http.StatusBadRequest, "chip_family does not match the registered board")
	}
	seenNames := make(map[string]bool, len(meta.Parts))
	seenOffsets := make(map[int64]bool, len(meta.Parts))
	var appName, appSHA string
	var appSize int64
	for _, part := range meta.Parts {
		if !validName.MatchString(part.Name) || !strings.HasSuffix(part.Name, ".bin") || part.Offset < 0 {
			return meta, "", "", 0, firmwareUploadError(http.StatusBadRequest, "invalid package part: "+part.Name)
		}
		if seenNames[part.Name] || seenOffsets[part.Offset] {
			return meta, "", "", 0, firmwareUploadError(http.StatusBadRequest, "duplicate package part name or offset")
		}
		seenNames[part.Name] = true
		seenOffsets[part.Offset] = true
		file, header, err := r.FormFile(part.Name)
		if err != nil {
			return meta, "", "", 0, firmwareUploadError(http.StatusBadRequest, "missing part file: "+part.Name)
		}
		if header.Filename != part.Name {
			file.Close()
			return meta, "", "", 0, firmwareUploadError(http.StatusBadRequest, "part filename must match field name: "+part.Name)
		}
		out, err := os.OpenFile(filepath.Join(dir, part.Name), os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0640)
		if err != nil {
			file.Close()
			return meta, "", "", 0, firmwareUploadError(http.StatusInternalServerError, err.Error())
		}
		hash := sha256.New()
		n, copyErr := io.Copy(io.MultiWriter(out, hash), io.LimitReader(file, maxFirmwarePartSize+1))
		closeErr := out.Close()
		file.Close()
		if copyErr != nil || closeErr != nil {
			return meta, "", "", 0, firmwareUploadError(http.StatusInternalServerError, "failed to store package part")
		}
		if n == 0 || n > maxFirmwarePartSize {
			return meta, "", "", 0, firmwareUploadError(http.StatusBadRequest, "invalid package part size: "+part.Name)
		}
		if part.Offset == meta.AppOffset {
			appName, appSHA, appSize = part.Name, hex.EncodeToString(hash.Sum(nil)), n
		}
	}
	if appName == "" {
		return meta, "", "", 0, firmwareUploadError(http.StatusBadRequest, "no part matched app_offset")
	}
	metaJSON, err := json.MarshalIndent(meta, "", "  ")
	if err != nil {
		return meta, "", "", 0, firmwareUploadError(http.StatusInternalServerError, err.Error())
	}
	if err = os.WriteFile(filepath.Join(dir, "package.json"), metaJSON, 0640); err != nil {
		return meta, "", "", 0, firmwareUploadError(http.StatusInternalServerError, err.Error())
	}
	return meta, appName, appSHA, appSize, nil
}

func (s *server) failFirmwareUpload(id string, err error) {
	message := err.Error()
	if len(message) > 1024 {
		message = message[:1024]
	}
	_, _ = s.db.Exec(`UPDATE firmware_uploads SET status='failed',token_hash='',error=?,updated_at=? WHERE id=? AND status!='published'`, message, time.Now().Unix(), id)
	s.recordAudit("upload", "firmware.upload_failed", id, map[string]any{"error": message})
}

func (s *server) publishFirmwareUpload(id string) (firmwarePublishOutput, error) {
	upload, err := s.getFirmwareUpload(id)
	if err != nil {
		return firmwarePublishOutput{}, err
	}
	if upload.Status == "published" {
		return s.publishedFirmwareOutput(upload)
	}
	if upload.Status != "uploaded" {
		return firmwarePublishOutput{}, fmt.Errorf("firmware upload is %s, not uploaded", upload.Status)
	}
	if time.Now().Unix() > upload.ExpiresAt {
		s.expireFirmwareUpload(id)
		return firmwarePublishOutput{}, errors.New("firmware upload session expired")
	}
	stagingDir := s.firmwareUploadPath(id)
	metaJSON, err := os.ReadFile(filepath.Join(stagingDir, "package.json"))
	if err != nil {
		return firmwarePublishOutput{}, errors.New("staged package metadata is missing")
	}
	var meta packageMeta
	if err = json.Unmarshal(metaJSON, &meta); err != nil || meta.Board != upload.Board || meta.Version != upload.Version || meta.Channel != upload.Channel {
		return firmwarePublishOutput{}, errors.New("staged package metadata failed verification")
	}
	appPath := filepath.Join(stagingDir, upload.AppName)
	appFile, err := os.Open(appPath)
	if err != nil {
		return firmwarePublishOutput{}, errors.New("staged application image is missing")
	}
	hash := sha256.New()
	size, hashErr := io.Copy(hash, appFile)
	appFile.Close()
	if hashErr != nil || size != upload.Size || hex.EncodeToString(hash.Sum(nil)) != upload.SHA256 {
		return firmwarePublishOutput{}, errors.New("staged application image failed SHA-256 verification")
	}

	var existingFilename, existingSHA, existingURL string
	var existingSize int64
	existingErr := s.db.QueryRow(`SELECT filename,sha256,size,url FROM releases WHERE board_type=? AND version=? AND channel=?`,
		upload.Board, upload.Version, upload.Channel).Scan(&existingFilename, &existingSHA, &existingSize, &existingURL)
	if existingErr != nil && existingErr != sql.ErrNoRows {
		return firmwarePublishOutput{}, existingErr
	}
	if existingErr == nil {
		if strings.HasPrefix(existingURL, "/packages/") {
			return firmwarePublishOutput{}, errors.New("complete package already exists")
		}
		if existingSHA != upload.SHA256 || existingSize != upload.Size {
			return firmwarePublishOutput{}, errors.New("release already exists with different firmware")
		}
	}
	finalDir := s.packageDir(upload.Board, upload.Version)
	if _, statErr := os.Stat(finalDir); statErr == nil {
		return firmwarePublishOutput{}, errors.New("package directory already exists")
	} else if !os.IsNotExist(statErr) {
		return firmwarePublishOutput{}, statErr
	}
	if err = os.MkdirAll(filepath.Dir(finalDir), 0750); err != nil {
		return firmwarePublishOutput{}, err
	}
	if err = os.Rename(stagingDir, finalDir); err != nil {
		return firmwarePublishOutput{}, err
	}
	rollbackFiles := func() { _ = os.Rename(finalDir, stagingDir) }

	tx, err := s.db.Begin()
	if err != nil {
		rollbackFiles()
		return firmwarePublishOutput{}, err
	}
	defer tx.Rollback()
	now := time.Now().Unix()
	appURL := fmt.Sprintf("/packages/%s/%s/%s", upload.Board, upload.Version, upload.AppName)
	relPath := fmt.Sprintf("%s/%s/%s", upload.Board, upload.Version, upload.AppName)
	if existingErr == nil {
		var result sql.Result
		result, err = tx.Exec(`UPDATE releases SET filename=?,notes=?,created_at=?,url=?,archived_at=0 WHERE board_type=? AND version=? AND channel=? AND sha256=? AND size=?`,
			relPath, upload.Notes, now, appURL, upload.Board, upload.Version, upload.Channel, upload.SHA256, upload.Size)
		if err == nil {
			if affected, _ := result.RowsAffected(); affected != 1 {
				err = errors.New("existing firmware release changed during publication")
			}
		}
	} else {
		_, err = tx.Exec(`INSERT INTO releases(board_type,version,channel,filename,sha256,size,notes,created_at,url,archived_at) VALUES(?,?,?,?,?,?,?,?,?,0)`,
			upload.Board, upload.Version, upload.Channel, relPath, upload.SHA256, upload.Size, upload.Notes, now, appURL)
	}
	if err == nil {
		var result sql.Result
		result, err = tx.Exec(`UPDATE firmware_uploads SET status='published',error='',updated_at=?,published_at=? WHERE id=? AND status='uploaded'`, now, now, id)
		if err == nil {
			if affected, _ := result.RowsAffected(); affected != 1 {
				err = errors.New("firmware upload status changed during publication")
			}
		}
	}
	if err != nil {
		rollbackFiles()
		return firmwarePublishOutput{}, err
	}
	if err = tx.Commit(); err != nil {
		rollbackFiles()
		return firmwarePublishOutput{}, err
	}
	if existingErr == nil && strings.HasPrefix(existingURL, "/firmware/") {
		_ = os.Remove(filepath.Join(s.firmwareDir, filepath.Base(existingFilename)))
	}
	s.recordAudit("mcp", "firmware.publish", id, map[string]any{
		"board": upload.Board, "version": upload.Version, "channel": upload.Channel, "sha256": upload.SHA256,
	})
	upload.Status = "published"
	upload.PublishedAt = now
	return s.publishedFirmwareOutput(upload)
}

func (s *server) publishedFirmwareOutput(upload firmwareUploadSession) (firmwarePublishOutput, error) {
	meta, err := s.readPackageMeta(upload.Board, upload.Version)
	if err != nil {
		return firmwarePublishOutput{}, err
	}
	appURL := s.publicPath(fmt.Sprintf("/packages/%s/%s/%s", upload.Board, upload.Version, upload.AppName))
	return firmwarePublishOutput{
		UploadID: upload.ID, Board: upload.Board, Version: upload.Version, Channel: upload.Channel,
		Status: "published", AppURL: appURL, SHA256: upload.SHA256, Size: upload.Size,
		PartCount: upload.PartCount, WebFlashable: meta.ChipFamily != "",
	}, nil
}

func (s *server) managedReleases(input mcpFirmwareListInput) ([]managedRelease, error) {
	input.Board = strings.TrimSpace(input.Board)
	input.Channel = strings.TrimSpace(input.Channel)
	if !validName.MatchString(input.Board) || (input.Channel != "" && input.Channel != "stable" && input.Channel != "beta") {
		return nil, errors.New("invalid board or channel")
	}
	if !s.boardExists(input.Board) {
		return nil, errors.New("board is not registered")
	}
	query := `SELECT version,channel,filename,sha256,size,notes,created_at,url,archived_at FROM releases WHERE board_type=?`
	args := []any{input.Board}
	if input.Channel != "" {
		query += ` AND channel=?`
		args = append(args, input.Channel)
	}
	if !input.IncludeArchived {
		query += ` AND archived_at=0`
	}
	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var releases []managedRelease
	for rows.Next() {
		var item managedRelease
		var filename, storedURL string
		if err = rows.Scan(&item.Version, &item.Channel, &filename, &item.SHA256, &item.Size, &item.Notes, &item.CreatedAt, &storedURL, &item.ArchivedAt); err != nil {
			return nil, err
		}
		if storedURL == "" {
			storedURL = "/firmware/" + filename
		}
		item.URL = s.publicPath(storedURL)
		releases = append(releases, item)
	}
	sort.SliceStable(releases, func(i, j int) bool {
		if versionKey(releases[i].Version) == versionKey(releases[j].Version) {
			return releases[i].CreatedAt > releases[j].CreatedAt
		}
		return versionKey(releases[i].Version) > versionKey(releases[j].Version)
	})
	return releases, rows.Err()
}

func (s *server) setFirmwareArchived(input mcpFirmwareReleaseActionInput, archived bool, actor string) (mcpMutationOutput, error) {
	input.Board = strings.TrimSpace(input.Board)
	input.Version = strings.TrimSpace(input.Version)
	input.Channel = strings.TrimSpace(input.Channel)
	if input.Channel == "" {
		input.Channel = "stable"
	}
	if !input.Confirm {
		return mcpMutationOutput{}, errors.New("confirm must be true")
	}
	if !validName.MatchString(input.Board) || !validName.MatchString(input.Version) || (input.Channel != "stable" && input.Channel != "beta") {
		return mcpMutationOutput{}, errors.New("invalid board, version or channel")
	}
	archivedAt := int64(0)
	action, status := "firmware.restore", "active"
	if archived {
		archivedAt = time.Now().Unix()
		action, status = "firmware.archive", "archived"
	}
	result, err := s.db.Exec(`UPDATE releases SET archived_at=? WHERE board_type=? AND version=? AND channel=?`, archivedAt, input.Board, input.Version, input.Channel)
	if err != nil {
		return mcpMutationOutput{}, err
	}
	if affected, _ := result.RowsAffected(); affected != 1 {
		return mcpMutationOutput{}, errors.New("firmware release not found")
	}
	target := input.Board + "/" + input.Version + "/" + input.Channel
	s.recordAudit(actor, action, target, map[string]any{"status": status})
	return mcpMutationOutput{ID: target, Status: status, Message: "firmware release is " + status}, nil
}

// deleteFirmwareRelease permanently removes a release: the database row goes
// away and its files are deleted from disk. Unlike archiving this cannot be
// undone. A package directory is shared by every channel of the same
// board/version, so it is removed only once no other release references it.
func (s *server) deleteFirmwareRelease(input mcpFirmwareReleaseActionInput, actor string) (mcpMutationOutput, error) {
	input.Board = strings.TrimSpace(input.Board)
	input.Version = strings.TrimSpace(input.Version)
	input.Channel = strings.TrimSpace(input.Channel)
	if input.Channel == "" {
		input.Channel = "stable"
	}
	if !input.Confirm {
		return mcpMutationOutput{}, errors.New("confirm must be true")
	}
	if !validName.MatchString(input.Board) || !validName.MatchString(input.Version) || (input.Channel != "stable" && input.Channel != "beta") {
		return mcpMutationOutput{}, errors.New("invalid board, version or channel")
	}
	var filename, storedURL string
	err := s.db.QueryRow(`SELECT filename,url FROM releases WHERE board_type=? AND version=? AND channel=?`,
		input.Board, input.Version, input.Channel).Scan(&filename, &storedURL)
	if err == sql.ErrNoRows {
		return mcpMutationOutput{}, errors.New("firmware release not found")
	}
	if err != nil {
		return mcpMutationOutput{}, err
	}
	result, err := s.db.Exec(`DELETE FROM releases WHERE board_type=? AND version=? AND channel=?`, input.Board, input.Version, input.Channel)
	if err != nil {
		return mcpMutationOutput{}, err
	}
	if affected, _ := result.RowsAffected(); affected != 1 {
		return mcpMutationOutput{}, errors.New("firmware release not found")
	}

	if strings.HasPrefix(storedURL, "/packages/") {
		var remaining int
		if err = s.db.QueryRow(`SELECT COUNT(*) FROM releases WHERE board_type=? AND version=?`, input.Board, input.Version).Scan(&remaining); err != nil {
			return mcpMutationOutput{}, err
		}
		if remaining == 0 {
			_ = os.RemoveAll(s.packageDir(input.Board, input.Version))
		}
	} else {
		// Legacy rows predate the url column and store flat files under firmware/.
		_ = os.Remove(filepath.Join(s.firmwareDir, filepath.Base(filename)))
	}

	target := input.Board + "/" + input.Version + "/" + input.Channel
	s.recordAudit(actor, "firmware.delete", target, map[string]any{"status": "deleted"})
	return mcpMutationOutput{ID: target, Status: "deleted", Message: "firmware release is deleted"}, nil
}
