// Package db handles database schema migrations at startup.
package db

import (
	"errors"
	"fmt"
	"net/url"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres" // registers the "postgres" scheme
	"github.com/golang-migrate/migrate/v4/source/iofs"

	"mailhub/migrations"
)

// BuildURL assembles a postgres connection URL from discrete settings,
// URL-encoding the password so special characters are safe.
func BuildURL(host, port, user, password, name, sslmode string) string {
	u := url.URL{
		Scheme:   "postgres",
		User:     url.UserPassword(user, password),
		Host:     fmt.Sprintf("%s:%s", host, port),
		Path:     "/" + name,
		RawQuery: "sslmode=" + url.QueryEscape(sslmode),
	}
	return u.String()
}

// Migrate applies all pending migrations embedded in the binary. It is
// safe to call on every startup: already-applied migrations are skipped,
// and no-op when the schema is current. golang-migrate takes a Postgres
// advisory lock, so concurrent instances won't race.
func Migrate(dbURL string) error {
	source, err := iofs.New(migrations.FS, ".")
	if err != nil {
		return fmt.Errorf("migrate: load embedded migrations: %w", err)
	}

	m, err := migrate.NewWithSourceInstance("iofs", source, dbURL)
	if err != nil {
		return fmt.Errorf("migrate: init: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("migrate: apply: %w", err)
	}
	return nil
}
