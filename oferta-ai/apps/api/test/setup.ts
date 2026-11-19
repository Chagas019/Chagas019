// Ambiente de testes: banco e Redis dedicados, modo sandbox, nunca publica mensagens reais.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://oferta:oferta@localhost:5432/oferta_ai_test";
process.env.REDIS_URL = process.env.TEST_REDIS_URL ?? "redis://localhost:6379/15";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123456";
process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
process.env.DATA_MODE = "sandbox";
process.env.LOG_LEVEL = "silent";
process.env.ADMIN_EMAIL = "admin@test.local";
process.env.ADMIN_PASSWORD = "senha-de-teste-123";
process.env.ANTHROPIC_API_KEY = "";
process.env.SHOPEE_APP_ID = "";
process.env.SHOPEE_APP_SECRET = "";
process.env.WHATSAPP_TOKEN = "";
process.env.TELEGRAM_BOT_TOKEN = "";
