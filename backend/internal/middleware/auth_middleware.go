package middleware

import (
	"context"
	"net/http"

	"mailhub/internal/repository"
)

const APIKeyContextKey = "apiKeyID"

func APIKeyAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		repo := r.Context().Value("repo")
		if repo == nil {
			http.Error(w, "repository not available", http.StatusInternalServerError)
			return
		}
		emailRepo, ok := repo.(repository.EmailRepository)
		if !ok {
			http.Error(w, "invalid repository", http.StatusInternalServerError)
			return
		}

		apiKey := r.Header.Get("X-API-Key")
		if apiKey == "" {
			http.Error(w, "missing api key", http.StatusUnauthorized)
			return
		}

		key, err := emailRepo.FindAPIKeyByHash(r.Context(), apiKey)
		if err != nil {
			http.Error(w, "invalid api key", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), APIKeyContextKey, key.ID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetAPIKeyID(ctx context.Context) (string, bool) {
	v, ok := ctx.Value(APIKeyContextKey).(string)
	return v, ok
}
