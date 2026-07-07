package security

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
)

// APIKeyPrefix marks MailHub secret keys so they are recognizable in logs
// and secret scanners without revealing anything about their owner.
const APIKeyPrefix = "mh_sk_"

// NewAPIKey returns a new random API key in plaintext. Only the hash
// (see HashAPIKey) should ever be persisted.
func NewAPIKey() (string, error) {
	var b [32]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	return APIKeyPrefix + hex.EncodeToString(b[:]), nil
}

// HashAPIKey returns the hex-encoded SHA-256 digest used to store and
// look up API keys.
func HashAPIKey(key string) string {
	sum := sha256.Sum256([]byte(key))
	return hex.EncodeToString(sum[:])
}

// NewID returns a random 128-bit hex identifier.
func NewID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		panic("security: crypto/rand unavailable: " + err.Error())
	}
	return hex.EncodeToString(b[:])
}
