//go:generate mockgen -source=mongo.go -destination=mock/mongo.go -package=mock
package db

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"ishkul.org/backend/utils"
)

const KEY_PREFIX = "ACCOUNT_RECOVER_KEY_"

type GlobalStorage struct {
	client *redis.Client
}

func MustNewGlobalStorage() *GlobalStorage {
	rdb := redis.NewClient(&redis.Options{
		Addr: fmt.Sprintf("%s:%s",
			utils.GetEnvOrDefault("REDIS_HOST", "localhost"),
			utils.GetEnvOrDefault("REDIS_PORT", "6379"),
		),
		Password: "", // no password set
		DB:       0,  // use default DB
		Protocol: 3,  // specify 2 for RESP 2 or 3 for RESP 3
	})

	return &GlobalStorage{client: rdb}
}

func (g *GlobalStorage) StoreAccountRecoveryKey(ctx context.Context, userID string, code string) error {
	return g.client.Set(ctx, KEY_PREFIX+userID, code, time.Minute*10).Err()
}

func (g *GlobalStorage) RetriveAccountRecoveryKey(ctx context.Context, userID string) (string, error) {
	code, err := g.client.Get(ctx, KEY_PREFIX+userID).Result()
	if err != nil {
		return "", err
	}
	return code, nil
}
