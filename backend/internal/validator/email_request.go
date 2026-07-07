// Package validator holds input validation for incoming API requests.
package validator

import (
	"net/mail"
	"strings"

	"mailhub/internal/domain"
)

// Error marks a validation failure so handlers can map it to a 400
// response instead of a generic 500.
type Error struct {
	Message string
}

func (e *Error) Error() string { return e.Message }

const (
	maxRecipientLength = 255
	maxSubjectLength   = 500
)

// ValidateSendEmailRequest normalizes the request in place and returns a
// *Error describing the first problem found, or nil if the request is valid.
func ValidateSendEmailRequest(req *domain.SendEmailRequest) error {
	req.To = strings.TrimSpace(req.To)
	req.Subject = strings.TrimSpace(req.Subject)
	req.Body = strings.TrimSpace(req.Body)

	switch {
	case req.To == "" || req.Subject == "" || req.Body == "":
		return &Error{Message: "to, subject, and body are required"}
	case len(req.To) > maxRecipientLength:
		return &Error{Message: "recipient address is too long"}
	case len(req.Subject) > maxSubjectLength:
		return &Error{Message: "subject must be at most 500 characters"}
	}

	if _, err := mail.ParseAddress(req.To); err != nil {
		return &Error{Message: "invalid recipient email address"}
	}
	return nil
}
