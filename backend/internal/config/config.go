package config

import (
	"fmt"
	"os"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	DBHost         string
	DBPort         string
	DBUser         string
	DBPassword     string
	DBName         string
	DBSSLMode      string
	AWSRegion      string
	SESSenderEmail string
	MaxRetryCount  int
	RetryBaseDelay time.Duration
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	cfg := &Config{
		Port:           getEnv("PORT", "8080"),
		DBHost:         getEnv("DB_HOST", "localhost"),
		DBPort:         getEnv("DB_PORT", "5432"),
		DBUser:         getEnv("DB_USER", "postgres"),
		DBPassword:     getEnv("DB_PASSWORD", ""),
		DBName:         getEnv("DB_NAME", "transactional_email_service"),
		DBSSLMode:      getEnv("DB_SSLMODE", "disable"),
		AWSRegion:      getEnv("AWS_REGION", "us-east-1"),
		SESSenderEmail: getEnv("SES_SENDER_EMAIL", ""),
	}

	if v, err := getEnvAsInt("MAX_RETRY_COUNT"); err == nil {
		cfg.MaxRetryCount = v
	} else {
		cfg.MaxRetryCount = 3
	}

	if v, err := getEnvAsInt("RETRY_BASE_DELAY_MS"); err == nil {
		cfg.RetryBaseDelay = time.Duration(v) * time.Millisecond
	} else {
		cfg.RetryBaseDelay = 500 * time.Millisecond
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvAsInt(key string) (int, error) {
	v := getEnv(key, "")
	var n int
	_, err := fmt.Sscanf(v, "%d", &n)
	return n, err
}
