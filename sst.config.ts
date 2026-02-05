/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "japanese-read-helper",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
      providers: {
        aws: {
          region: "ap-northeast-1",
        },
      },
    };
  },
  async run() {
    // SST Secrets use SSM Parameter Store (SecureString) - free tier
    const geminiApiKey = new sst.Secret("GeminiApiKey");
    const authPasswordHash = new sst.Secret("AuthPasswordHash");
    const databaseUrl = new sst.Secret("DatabaseUrl");
    const googleTranslateApiKey = new sst.Secret("GoogleTranslateApiKey");

    const web = new sst.aws.Nextjs("JapaneseReadHelper", {
      openNextVersion: "3.4.1",
      link: [geminiApiKey, authPasswordHash, databaseUrl, googleTranslateApiKey],
      environment: {
        GEMINI_API_KEY: geminiApiKey.value,
        AUTH_PASSWORD_HASH: authPasswordHash.value,
        DATABASE_URL: databaseUrl.value,
        POSTGRES_URL: databaseUrl.value,
        GOOGLE_TRANSLATE_API_KEY: googleTranslateApiKey.value,
      },
      warm: 1,
    });

    return {
      url: web.url,
    };
  },
});
