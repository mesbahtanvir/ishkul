//go:generate mockgen -source=mongo.go -destination=mock/mongo.go -package=mock
package db

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"ishkul.org/backend/utils"
)

type GlobalStorage struct {
	client *redis.Client
}

var GetRedisAddr = func() string {
	return fmt.Sprintf("%s:%s",
		utils.GetEnvOrDefault("REDIS_HOST", "localhost"),
		utils.GetEnvOrDefault("REDIS_PORT", "6379"),
	)
}

func MustNewGlobalStorage() *GlobalStorage {
	rdb := redis.NewClient(&redis.Options{
		Addr:     GetRedisAddr(),
		Password: "", // no password set
		DB:       0,  // use default DB
		Protocol: 3,  // specify 2 for RESP 2 or 3 for RESP 3
	})

	return &GlobalStorage{client: rdb}
}

func getVerifyRedisKey(userID string) string {
	return fmt.Sprintf("verify_key:%s", userID)
}

func getQuotaRedisKey(userID string) string {
	currentDate := time.Now().Format("2006-01-02")
	return fmt.Sprintf("quota:%s:%s", userID, currentDate)
}

func (g *GlobalStorage) StoreAccountRecoveryKey(ctx context.Context, userID string, code string) error {
	return g.client.Set(ctx, getVerifyRedisKey(userID), code, time.Minute*10).Err()
}

func (g *GlobalStorage) RetriveAccountRecoveryKey(ctx context.Context, userID string) (string, error) {
	code, err := g.client.Get(ctx, getVerifyRedisKey(userID)).Result()
	if errors.Is(err, redis.Nil) {
		return "", &ErrKeyNotFound{Msg: "code not found"}
	}
	if err != nil {
		return "", err
	}
	return code, nil
}

func (g *GlobalStorage) RemoveAccountRecoveryKey(ctx context.Context, userID string) error {
	res, err := g.client.Del(ctx, getVerifyRedisKey(userID)).Result()
	if errors.Is(err, redis.Nil) {
		fmt.Println("A key suppose to get deleted but it did not")
		return nil
	}
	if err != nil {
		fmt.Printf("Redis error occured %e\n", err)
		return nil
	}
	if res > 1 {
		fmt.Printf("Only one key suppose to get deleted but deleted: %d\n", res)
		return nil
	}
	return nil
}

// IncrUserResourceRequest returns a error when user reach the limit
func (g *GlobalStorage) IncrUserResourceRequest(ctx context.Context, endpoint string, userID string, limit int64) error {
	key := getQuotaRedisKey(fmt.Sprintf("%s:%s", endpoint, userID))
	val, err := g.client.Incr(ctx, key).Result()
	if err != nil {
		fmt.Println("Error incrementing key:", key, err)
		return nil //errors.New("you've reached your limit for today")
	}
	if val == 1 {
		if _, err = g.client.Expire(ctx, key, time.Hour*24).Result(); err != nil {
			fmt.Println("Error setting key expiry:", key, err)
		}
	}
	if val > limit {
		if _, err := g.client.Decr(ctx, key).Result(); err != nil {
			fmt.Println("Error decrementing key:", key, err)
		}
		return errors.New("you've reached your limit for today")
	}
	return nil
}
