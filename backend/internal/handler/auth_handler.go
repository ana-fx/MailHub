package handler

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"

	"mailhub/internal/domain"
	"mailhub/internal/repository"
)

type AuthHandler struct {
	repo repository.EmailRepository
}

func NewAuthHandler(repo repository.EmailRepository) *AuthHandler {
	return &AuthHandler{repo: repo}
}

func (h *AuthHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /auth/login", h.Login)
	mux.HandleFunc("POST /auth/register", h.Register)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req domain.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	req.Email = strings.TrimSpace(req.Email)
	req.Password = strings.TrimSpace(req.Password)

	if req.Email == "" || req.Password == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "email and password are required"})
		return
	}

	user, err := h.repo.FindUserByEmail(r.Context(), req.Email)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
		return
	}
	if user == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid credentials"})
		return
	}

	hash := sha256.Sum256([]byte(req.Password))
	passwordHash := hex.EncodeToString(hash[:])
	if user.Password != passwordHash {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid credentials"})
		return
	}

	apiKey := "mh_sk_" + hex.EncodeToString([]byte(user.ID + ":" + user.Email))
	if err := h.repo.CreateAPIKey(r.Context(), &domain.APIKey{
		ID:      user.ID + "-default",
		Name:    user.Email,
		KeyHash: apiKey,
	}); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create api key"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"apiKey": apiKey})
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req domain.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	req.Email = strings.TrimSpace(req.Email)
	req.Password = strings.TrimSpace(req.Password)

	if req.Email == "" || req.Password == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "email and password are required"})
		return
	}

	existingUser, _ := h.repo.FindUserByEmail(r.Context(), req.Email)
	if existingUser != nil {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "email already registered"})
		return
	}

	hash := sha256.Sum256([]byte(req.Password))
	passwordHash := hex.EncodeToString(hash[:])
	userID := hex.EncodeToString([]byte(req.Email + ":user"))

	if err := h.repo.CreateUser(r.Context(), &domain.User{
		ID:        userID,
		Email:     req.Email,
		Password:  passwordHash,
		IsActive:  true,
		CreatedAt: "",
	}); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to register user"})
		return
	}

	apiKey := "mh_sk_" + hex.EncodeToString([]byte(userID + ":" + req.Email))
	if err := h.repo.CreateAPIKey(r.Context(), &domain.APIKey{
		ID:      userID + "-default",
		Name:    req.Email,
		KeyHash: apiKey,
	}); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create api key"})
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"apiKey": apiKey})
}
