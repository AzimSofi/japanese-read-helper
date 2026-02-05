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
    // Use SSM parameters directly (easier to set via AWS CLI)
    const stage = $app.stage;
    const ssmPrefix = `japanese-read-helper-${stage}`;

    const geminiApiKey = await aws.ssm.getParameter({
      name: `${ssmPrefix}-GEMINI_API_KEY`,
      withDecryption: true,
    });
    const authPasswordHash = await aws.ssm.getParameter({
      name: `${ssmPrefix}-AUTH_PASSWORD_HASH`,
      withDecryption: true,
    });
    const databaseUrl = await aws.ssm.getParameter({
      name: `${ssmPrefix}-DATABASE_URL`,
      withDecryption: true,
    });
    const googleTranslateApiKey = await aws.ssm.getParameter({
      name: `${ssmPrefix}-GOOGLE_TRANSLATE_API_KEY`,
      withDecryption: true,
    });

    const web = new sst.aws.Nextjs("JapaneseReadHelper", {
      openNextVersion: "3.4.1",
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
