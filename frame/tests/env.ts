import os from "node:os";
import path from "node:path";

/** Ambiente isolado dos testes: banco frame_test e storage temporário. */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://frame:frame@localhost:5432/frame_test";
export const TEST_STORAGE_DIR = path.join(os.tmpdir(), "frame-test-storage");

export function applyTestEnv() {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.LOCAL_STORAGE_DIR = TEST_STORAGE_DIR;
  process.env.STORAGE_DRIVER = "local";
  process.env.CHALLENGE_MIN_ACCOUNT_AGE_HOURS = "0";
  process.env.FRAME_DISABLE_APP_RATE_LIMIT = "1";
}
