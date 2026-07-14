// Package migrations embeds the SQL migration files into the binary so the
// service can apply them automatically at startup — no external files or
// migrate CLI needed at runtime.
package migrations

import "embed"

//go:embed *.sql
var FS embed.FS
