package validator

import (
	"net/mail"
	"strings"

	"mailhub/internal/domain"
)

const (
	maxContactNameLength    = 255
	maxContactEmailLength   = 255
	maxContactPhoneLength   = 50
	maxContactAddressLength = 500
)

// ValidateContactRequest normalizes the request in place and returns a
// *Error describing the first problem found, or nil if the request is
// valid. Only the email is required; name, phone, and address are optional.
func ValidateContactRequest(req *domain.ContactRequest) error {
	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.Phone = strings.TrimSpace(req.Phone)
	req.Address = strings.TrimSpace(req.Address)

	switch {
	case req.Email == "":
		return &Error{Message: "email is required"}
	case len(req.Email) > maxContactEmailLength:
		return &Error{Message: "email is too long"}
	case len(req.Name) > maxContactNameLength:
		return &Error{Message: "name must be at most 255 characters"}
	case len(req.Phone) > maxContactPhoneLength:
		return &Error{Message: "phone must be at most 50 characters"}
	case len(req.Address) > maxContactAddressLength:
		return &Error{Message: "address must be at most 500 characters"}
	}

	if _, err := mail.ParseAddress(req.Email); err != nil {
		return &Error{Message: "invalid email address"}
	}
	return nil
}
