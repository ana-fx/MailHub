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

type ContactHandler struct {
	contactService *service.ContactService
}

func NewContactHandler(contactService *service.ContactService) *ContactHandler {
	return &ContactHandler{contactService: contactService}
}

func (h *ContactHandler) RegisterRoutes(mux *http.ServeMux, auth func(http.Handler) http.Handler) {
	mux.Handle("POST /api/v1/contacts", auth(http.HandlerFunc(h.Create)))
	mux.Handle("GET /api/v1/contacts", auth(http.HandlerFunc(h.List)))
	mux.Handle("PUT /api/v1/contacts/{id}", auth(http.HandlerFunc(h.Update)))
	mux.Handle("DELETE /api/v1/contacts/{id}", auth(http.HandlerFunc(h.Delete)))
}

func (h *ContactHandler) Create(w http.ResponseWriter, r *http.Request) {
	apiKeyID, ok := middleware.GetAPIKeyID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req domain.ContactRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	contact, err := h.contactService.Create(r.Context(), apiKeyID, &req)
	if err != nil {
		writeContactError(w, err)
		return
	}

	response.Success(w, http.StatusCreated, contact)
}

func (h *ContactHandler) List(w http.ResponseWriter, r *http.Request) {
	apiKeyID, ok := middleware.GetAPIKeyID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	contacts, err := h.contactService.List(r.Context(), apiKeyID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	response.Success(w, http.StatusOK, contacts)
}

func (h *ContactHandler) Update(w http.ResponseWriter, r *http.Request) {
	apiKeyID, ok := middleware.GetAPIKeyID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req domain.ContactRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	contact, err := h.contactService.Update(r.Context(), apiKeyID, r.PathValue("id"), &req)
	if err != nil {
		writeContactError(w, err)
		return
	}

	response.Success(w, http.StatusOK, contact)
}

func (h *ContactHandler) Delete(w http.ResponseWriter, r *http.Request) {
	apiKeyID, ok := middleware.GetAPIKeyID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	if err := h.contactService.Delete(r.Context(), apiKeyID, r.PathValue("id")); err != nil {
		writeContactError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// writeContactError maps service/repository errors to HTTP status codes.
func writeContactError(w http.ResponseWriter, err error) {
	var vErr *validator.Error
	switch {
	case errors.As(err, &vErr):
		response.Error(w, http.StatusBadRequest, vErr.Message)
	case errors.Is(err, repository.ErrDuplicateContact):
		response.Error(w, http.StatusConflict, repository.ErrDuplicateContact.Error())
	case errors.Is(err, repository.ErrContactNotFound):
		response.Error(w, http.StatusNotFound, repository.ErrContactNotFound.Error())
	default:
		response.Error(w, http.StatusInternalServerError, "internal error")
	}
}
