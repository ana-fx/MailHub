package validator

import (
	"regexp"
	"strings"

	"mailhub/internal/domain"
)

const maxDomainLength = 255

// A pragmatic domain check: labels of letters/digits/hyphens separated by
// dots, with a final alphabetic TLD. Not a full RFC parser, but enough to
// reject emails, URLs, and obvious typos before calling SES.
var domainPattern = regexp.MustCompile(`^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$`)

// ValidateCreateDomainRequest normalizes the domain in place (lowercase,
// trimmed, no scheme or trailing dot) and validates its shape.
func ValidateCreateDomainRequest(req *domain.CreateDomainRequest) error {
	d := strings.ToLower(strings.TrimSpace(req.Domain))
	d = strings.TrimPrefix(d, "http://")
	d = strings.TrimPrefix(d, "https://")
	d = strings.TrimSuffix(d, "/")
	d = strings.TrimSuffix(d, ".")
	req.Domain = d

	switch {
	case d == "":
		return &Error{Message: "domain is required"}
	case len(d) > maxDomainLength:
		return &Error{Message: "domain is too long"}
	case strings.Contains(d, "@"):
		return &Error{Message: "enter a domain, not an email address"}
	case !domainPattern.MatchString(d):
		return &Error{Message: "invalid domain name"}
	}
	return nil
}
