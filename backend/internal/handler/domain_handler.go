package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"mailhub/internal/domain"
	"mailhub/internal/middleware"
	"mailhub/internal/repository"
	"mailhub/internal/service"
	"mailhub/internal/validator"
	"mailhub/pkg/response"
)

type DomainHandler struct {
	domainService *service.DomainService
}

func NewDomainHandler(domainService *service.DomainService) *DomainHandler {
	return &DomainHandler{domainService: domainService}
}

func (h *DomainHandler) RegisterRoutes(mux *http.ServeMux, auth func(http.Handler) http.Handler) {
	mux.Handle("POST /api/v1/domains", auth(http.HandlerFunc(h.Create)))
	mux.Handle("GET /api/v1/domains", auth(http.HandlerFunc(h.List)))
	mux.Handle("POST /api/v1/domains/{id}/verify", auth(http.HandlerFunc(h.Verify)))
	mux.Handle("DELETE /api/v1/domains/{id}", auth(http.HandlerFunc(h.Delete)))
}

func (h *DomainHandler) Create(w http.ResponseWriter, r *http.Request) {
	apiKeyID, ok := middleware.GetAPIKeyID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req domain.CreateDomainRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	d, err := h.domainService.Create(r.Context(), apiKeyID, &req)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	response.Success(w, http.StatusCreated, d)
}

func (h *DomainHandler) List(w http.ResponseWriter, r *http.Request) {
	apiKeyID, ok := middleware.GetAPIKeyID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	domains, err := h.domainService.List(r.Context(), apiKeyID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	response.Success(w, http.StatusOK, domains)
}

func (h *DomainHandler) Verify(w http.ResponseWriter, r *http.Request) {
	apiKeyID, ok := middleware.GetAPIKeyID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	d, err := h.domainService.Verify(r.Context(), apiKeyID, r.PathValue("id"))
	if err != nil {
		writeDomainError(w, err)
		return
	}

	response.Success(w, http.StatusOK, d)
}

func (h *DomainHandler) Delete(w http.ResponseWriter, r *http.Request) {
	apiKeyID, ok := middleware.GetAPIKeyID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	if err := h.domainService.Delete(r.Context(), apiKeyID, r.PathValue("id")); err != nil {
		writeDomainError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// writeDomainError maps service/repository/provider errors to HTTP codes.
// Provider (SES) failures fall through to 502 so the client can tell them
// apart from validation and conflict errors.
func writeDomainError(w http.ResponseWriter, err error) {
	var vErr *validator.Error
	switch {
	case errors.As(err, &vErr):
		response.Error(w, http.StatusBadRequest, vErr.Message)
	case errors.Is(err, repository.ErrDuplicateDomain):
		response.Error(w, http.StatusConflict, repository.ErrDuplicateDomain.Error())
	case errors.Is(err, repository.ErrDomainNotFound):
		response.Error(w, http.StatusNotFound, repository.ErrDomainNotFound.Error())
	default:
		response.Error(w, http.StatusBadGateway, "email provider error")
	}
}
