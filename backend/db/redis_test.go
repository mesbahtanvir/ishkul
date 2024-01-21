package db

import (
	"context"
	"os"
	"testing"

	"github.com/alicebob/miniredis"
	"github.com/stretchr/testify/assert"
)

func TestGetRedisAddr(t *testing.T) {
	assert.Equal(t, "localhost:6379", GetRedisAddr())
	os.Setenv("REDIS_HOST", "redis")
	os.Setenv("REDIS_PORT", "6789")
	assert.Equal(t, "redis:6789", GetRedisAddr())

}

func TestMyRedisFunction(t *testing.T) {
	// Start a miniredis server
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatal(err)
	}
	defer mr.Close()
	GetRedisAddr = mr.Addr

	storage := MustNewGlobalStorage()

	// Retrive known key
	err = storage.StoreAccountRecoveryKey(context.Background(), "Mesbah", "123")
	assert.Nil(t, err)
	code, err := storage.RetriveAccountRecoveryKey(context.Background(), "Mesbah")
	assert.Nil(t, err)
	assert.Equal(t, "123", code)

	// Retrive unknown key
	err = storage.StoreAccountRecoveryKey(context.Background(), "Mesbah", "123")
	assert.Nil(t, err)
	_, err = storage.RetriveAccountRecoveryKey(context.Background(), "Tanvir")
	assert.Equal(t, ErrRedisKeyNotFound, err)

	// Remove key successfully
	err = storage.RemoveAccountRecoveryKey(context.Background(), "Mesbah")
	assert.Nil(t, err)
	code, err = storage.RetriveAccountRecoveryKey(context.Background(), "Mesbah")
	assert.Equal(t, ErrRedisKeyNotFound, err)
	assert.Equal(t, "", code)

}
