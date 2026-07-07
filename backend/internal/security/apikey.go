package security

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
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

// DefaultKeyID derives a stable UUID for the user's default API key slot,
// so logging in again rotates the same row instead of inserting a new one.
// Only the row ID is deterministic; the key material itself is random.
func DefaultKeyID(userID string) string {
	sum := sha256.Sum256([]byte(userID + "/default-key"))
	return formatUUID(sum[:16])
}

func formatUUID(b []byte) string {
	b[6] = (b[6] & 0x0f) | 0x40 // version 4 layout
	b[8] = (b[8] & 0x3f) | 0x80 // RFC 4122 variant
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}
