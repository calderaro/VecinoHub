process.env.TEST_DATABASE_URL ??=
  "postgres://vecinohub:vecinohub@localhost:5432/vecinohub_test";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.BETTER_AUTH_SECRET ??= "test-secret";
