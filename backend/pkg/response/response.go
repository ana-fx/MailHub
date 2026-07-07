// Package response provides the standard JSON envelope used by every
// endpoint: {"success": true, "data": ...} or {"success": false, "error": "..."}.
package response

import (
	"encoding/json"
	"net/http"
)

type envelope struct {
	Success bool   `json:"success"`
	Data    any    `json:"data,omitempty"`
	Error   string `json:"error,omitempty"`
}

func write(w http.ResponseWriter, status int, body envelope) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func Success(w http.ResponseWriter, status int, data any) {
	write(w, status, envelope{Success: true, Data: data})
}

func Error(w http.ResponseWriter, status int, message string) {
	write(w, status, envelope{Success: false, Error: message})
}
