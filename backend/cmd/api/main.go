package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"mailhub/internal/config"
	"mailhub/internal/handler"
	"mailhub/internal/middleware"
	"mailhub/internal/provider"
	"mailhub/internal/repository"
	"mailhub/internal/service"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	ctx := context.Background()
	repo, err := repository.NewPostgres(ctx, fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBSSLMode))
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer repo.Close()

	sesProvider, err := provider.NewSESProvider(cfg.AWSRegion, cfg.AWSAccessKeyID, cfg.AWSSecretKey, cfg.SESSenderEmail)
	if err != nil {
		log.Fatalf("ses init: %v", err)
	}

	emailService := service.NewEmailService(repo, sesProvider, cfg.MaxRetryCount, cfg.RetryBaseDelay)
	emailHandler := handler.NewEmailHandler(emailService)
	authHandler := handler.NewAuthHandler(repo)

	mux := http.NewServeMux()
	emailHandler.RegisterRoutes(mux)
	authHandler.RegisterRoutes(mux)

	withRepo := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r2 := r.WithContext(context.WithValue(r.Context(), middleware.RepoContextKey, repo))
		mux.ServeHTTP(w, r2)
	})

	addr := "0.0.0.0:" + cfg.Port
	log.Printf("listening on %s", addr)
	if err := http.ListenAndServe(addr, middleware.Cors(withRepo)); err != nil {
		log.Fatalf("server: %v", err)
	}
}
