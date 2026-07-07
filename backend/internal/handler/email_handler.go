package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"mailhub/internal/domain"
	"mailhub/internal/middleware"
	"mailhub/internal/service"
	"mailhub/internal/validator"
	"mailhub/pkg/response"
)

type EmailHandler struct {
	emailService *service.EmailService
}

func NewEmailHandler(emailService *service.EmailService) *EmailHandler {
	return &EmailHandler{emailService: emailService}
}

func (h *EmailHandler) RegisterRoutes(mux *http.ServeMux, auth func(http.Handler) http.Handler) {
	mux.Handle("POST /api/v1/emails", auth(http.HandlerFunc(h.SendEmail)))
}

func (h *EmailHandler) SendEmail(w http.ResponseWriter, r *http.Request) {
	apiKeyID, ok := middleware.GetAPIKeyID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req domain.SendEmailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	resp, err := h.emailService.SendEmail(r.Context(), apiKeyID, &req)
	if err != nil {
		var vErr *validator.Error
		switch {
		case errors.As(err, &vErr):
			response.Error(w, http.StatusBadRequest, vErr.Message)
		case errors.Is(err, service.ErrDeliveryFailed):
			response.Error(w, http.StatusInternalServerError, "email delivery failed")
		default:
			response.Error(w, http.StatusInternalServerError, "internal error")
		}
		return
	}

	response.Success(w, http.StatusAccepted, resp)
}
