package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

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

	sesProvider, err := provider.NewSESProvider(cfg.AWSRegion, cfg.SESSenderEmail)
	if err != nil {
		log.Fatalf("ses init: %v", err)
	}

	emailService := service.NewEmailService(repo, sesProvider, cfg.MaxRetryCount, cfg.RetryBaseDelay)
	contactService := service.NewContactService(repo)

	auth := middleware.APIKeyAuth(repo)
	mux := http.NewServeMux()
	handler.NewEmailHandler(emailService).RegisterRoutes(mux, auth)
	handler.NewContactHandler(contactService).RegisterRoutes(mux, auth)
	handler.NewAuthHandler(repo).RegisterRoutes(mux)

	srv := &http.Server{
		Addr:              "0.0.0.0:" + cfg.Port,
		Handler:           middleware.Cors(mux),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	log.Printf("listening on %s", srv.Addr)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("server: %v", err)
	}
}
