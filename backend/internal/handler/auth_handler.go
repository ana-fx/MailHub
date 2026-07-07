package handler

import (
	"encoding/json"
	"net/http"
	"net/mail"
	"strings"

	"golang.org/x/crypto/bcrypt"

	"mailhub/internal/domain"
	"mailhub/internal/repository"
	"mailhub/internal/security"
	"mailhub/pkg/response"
)

const minPasswordLength = 8

type AuthHandler struct {
	repo repository.EmailRepository
}

func NewAuthHandler(repo repository.EmailRepository) *AuthHandler {
	return &AuthHandler{repo: repo}
}

func (h *AuthHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/v1/auth/login", h.Login)
	mux.HandleFunc("POST /api/v1/auth/register", h.Register)
}

// Login verifies the user's credentials and rotates their default API key.
// The plaintext key is returned once; only its hash is stored.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	req, ok := decodeCredentials(w, r)
	if !ok {
		return
	}

	user, err := h.repo.FindUserByEmail(r.Context(), req.Email)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "internal error")
		return
	}
	if user == nil || !user.IsActive {
		response.Error(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		response.Error(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	apiKey, err := h.issueAPIKey(r, user)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to issue api key")
		return
	}

	response.Success(w, http.StatusOK, domain.AuthResponse{APIKey: apiKey})
}

// Register creates a new user and issues their first API key.
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	req, ok := decodeCredentials(w, r)
	if !ok {
		return
	}

	if len(req.Password) < minPasswordLength {
		response.Error(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}

	existing, err := h.repo.FindUserByEmail(r.Context(), req.Email)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "internal error")
		return
	}
	if existing != nil {
		response.Error(w, http.StatusConflict, "email already registered")
		return
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	user := &domain.User{
		Email:        req.Email,
		PasswordHash: string(passwordHash),
		IsActive:     true,
	}
	if err := h.repo.CreateUser(r.Context(), user); err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to register user")
		return
	}

	apiKey, err := h.issueAPIKey(r, user)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to issue api key")
		return
	}

	response.Success(w, http.StatusCreated, domain.AuthResponse{APIKey: apiKey})
}

// issueAPIKey generates a fresh random key for the user's default key slot
// and stores its hash, replacing any previous key.
func (h *AuthHandler) issueAPIKey(r *http.Request, user *domain.User) (string, error) {
	apiKey, err := security.NewAPIKey()
	if err != nil {
		return "", err
	}

	err = h.repo.UpsertAPIKey(r.Context(), &domain.APIKey{
		ID:      security.DefaultKeyID(user.ID),
		Name:    user.Email,
		KeyHash: security.HashAPIKey(apiKey),
	})
	if err != nil {
		return "", err
	}
	return apiKey, nil
}

// decodeCredentials parses and validates the shared login/register payload.
// It writes the error response itself and returns ok=false on failure.
func decodeCredentials(w http.ResponseWriter, r *http.Request) (domain.CredentialsRequest, bool) {
	var req domain.CredentialsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return req, false
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	if req.Email == "" || req.Password == "" {
		response.Error(w, http.StatusBadRequest, "email and password are required")
		return req, false
	}
	if _, err := mail.ParseAddress(req.Email); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid email address")
		return req, false
	}
	return req, true
}
