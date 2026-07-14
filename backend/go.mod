module mailhub

go 1.24.0

toolchain go1.24.7

require (
	github.com/aws/aws-sdk-go-v2 v1.42.1
	github.com/aws/aws-sdk-go-v2/config v1.26.0
	github.com/aws/aws-sdk-go-v2/service/ses v1.30.0
	github.com/aws/aws-sdk-go-v2/service/sesv2 v1.63.1
	github.com/golang-migrate/migrate/v4 v4.19.1
	github.com/joho/godotenv v1.5.1
	github.com/lib/pq v1.12.3
	golang.org/x/crypto v0.45.0
)

require (
	github.com/aws/aws-sdk-go-v2/credentials v1.16.11 // indirect
	github.com/aws/aws-sdk-go-v2/feature/ec2/imds v1.14.10 // indirect
	github.com/aws/aws-sdk-go-v2/internal/configsources v1.4.30 // indirect
	github.com/aws/aws-sdk-go-v2/internal/endpoints/v2 v2.7.30 // indirect
	github.com/aws/aws-sdk-go-v2/internal/ini v1.7.1 // indirect
	github.com/aws/aws-sdk-go-v2/internal/v4a v1.4.31 // indirect
	github.com/aws/aws-sdk-go-v2/service/internal/accept-encoding v1.10.4 // indirect
	github.com/aws/aws-sdk-go-v2/service/internal/presigned-url v1.10.9 // indirect
	github.com/aws/aws-sdk-go-v2/service/sso v1.18.4 // indirect
	github.com/aws/aws-sdk-go-v2/service/ssooidc v1.21.4 // indirect
	github.com/aws/aws-sdk-go-v2/service/sts v1.26.4 // indirect
	github.com/aws/smithy-go v1.27.3 // indirect
)
