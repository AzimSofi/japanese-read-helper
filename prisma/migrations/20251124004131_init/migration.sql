-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "textFilePath" TEXT NOT NULL,
    "originalEpubName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookImage" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "chapterName" TEXT,
    "altText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessingHistory" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filterMode" TEXT NOT NULL,
    "hiraganaStyle" TEXT NOT NULL,
    "chaptersCount" INTEGER NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "imageCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProcessingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBookmark" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "userId" TEXT DEFAULT 'default',
    "bookmarkText" TEXT NOT NULL,
    "position" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Book_fileName_key" ON "Book"("fileName");

-- CreateIndex
CREATE INDEX "Book_fileName_idx" ON "Book"("fileName");

-- CreateIndex
CREATE INDEX "BookImage_bookId_orderIndex_idx" ON "BookImage"("bookId", "orderIndex");

-- CreateIndex
CREATE INDEX "BookImage_bookId_idx" ON "BookImage"("bookId");

-- CreateIndex
CREATE INDEX "ProcessingHistory_bookId_idx" ON "ProcessingHistory"("bookId");

-- CreateIndex
CREATE INDEX "ProcessingHistory_processedAt_idx" ON "ProcessingHistory"("processedAt");

-- CreateIndex
CREATE INDEX "UserBookmark_bookId_idx" ON "UserBookmark"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBookmark_bookId_userId_key" ON "UserBookmark"("bookId", "userId");

-- AddForeignKey
ALTER TABLE "BookImage" ADD CONSTRAINT "BookImage_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessingHistory" ADD CONSTRAINT "ProcessingHistory_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBookmark" ADD CONSTRAINT "UserBookmark_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
