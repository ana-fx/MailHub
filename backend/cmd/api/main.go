package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"mailhub/internal/config"
	"mailhub/internal/handler"
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
	h := handler.NewEmailHandler(emailService)

	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	addr := ":" + cfg.Port
	log.Printf("listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("server: %v", err)
	}
}
