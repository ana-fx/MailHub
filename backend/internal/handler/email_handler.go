package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"mailhub/internal/domain"
	"mailhub/internal/middleware"
	"mailhub/internal/service"
)

type EmailHandler struct {
	emailService *service.EmailService
}

func NewEmailHandler(emailService *service.EmailService) *EmailHandler {
	return &EmailHandler{emailService: emailService}
}

func (h *EmailHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /emails/send", middleware.APIKeyAuthMiddleware(http.HandlerFunc(h.SendEmail)).ServeHTTP)
}

func (h *EmailHandler) SendEmail(w http.ResponseWriter, r *http.Request) {
	apiKeyID, ok := middleware.GetAPIKeyID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	var req domain.SendEmailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	req.To = strings.TrimSpace(req.To)
	req.Subject = strings.TrimSpace(req.Subject)
	req.Body = strings.TrimSpace(req.Body)

	if req.To == "" || req.Subject == "" || req.Body == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "to, subject, and body are required"})
		return
	}

	resp, err := h.emailService.SendEmail(r.Context(), apiKeyID, &req)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}
