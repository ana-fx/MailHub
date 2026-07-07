package middleware

import (
	"context"
	"net/http"

	"mailhub/internal/repository"
	"mailhub/internal/security"
)

type contextKey int

const apiKeyIDContextKey contextKey = iota

// APIKeyAuth returns middleware that authenticates requests via the
// X-API-Key header. The presented key is hashed before lookup, so only
// key hashes are ever compared or stored.
func APIKeyAuth(repo repository.EmailRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			apiKey := r.Header.Get("X-API-Key")
			if apiKey == "" {
				http.Error(w, "missing api key", http.StatusUnauthorized)
				return
			}

			key, err := repo.FindAPIKeyByHash(r.Context(), security.HashAPIKey(apiKey))
			if err != nil {
				http.Error(w, "internal error", http.StatusInternalServerError)
				return
			}
			if key == nil {
				http.Error(w, "invalid api key", http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), apiKeyIDContextKey, key.ID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetAPIKeyID returns the authenticated API key ID stored by APIKeyAuth.
func GetAPIKeyID(ctx context.Context) (string, bool) {
	v, ok := ctx.Value(apiKeyIDContextKey).(string)
	return v, ok
}
