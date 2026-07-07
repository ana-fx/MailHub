package handler

import (
	"encoding/json"
	"net/http"
	"net/mail"
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

func (h *EmailHandler) RegisterRoutes(mux *http.ServeMux, auth func(http.Handler) http.Handler) {
	mux.Handle("POST /emails/send", auth(http.HandlerFunc(h.SendEmail)))
}

func (h *EmailHandler) SendEmail(w http.ResponseWriter, r *http.Request) {
	apiKeyID, ok := middleware.GetAPIKeyID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req domain.SendEmailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.To = strings.TrimSpace(req.To)
	req.Subject = strings.TrimSpace(req.Subject)
	req.Body = strings.TrimSpace(req.Body)

	if req.To == "" || req.Subject == "" || req.Body == "" {
		writeError(w, http.StatusBadRequest, "to, subject, and body are required")
		return
	}
	if _, err := mail.ParseAddress(req.To); err != nil {
		writeError(w, http.StatusBadRequest, "invalid recipient address")
		return
	}

	resp, err := h.emailService.SendEmail(r.Context(), apiKeyID, &req)
	if err != nil {
		writeError(w, http.StatusBadGateway, "email delivery failed")
		return
	}

	writeJSON(w, http.StatusOK, resp)
}
