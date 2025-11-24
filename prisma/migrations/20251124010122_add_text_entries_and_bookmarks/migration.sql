-- CreateTable
CREATE TABLE "bookmarks" (
    "id" SERIAL NOT NULL,
    "fileName" TEXT NOT NULL,
    "directory" TEXT NOT NULL,
    "bookmarkText" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "text_entries" (
    "id" SERIAL NOT NULL,
    "fileName" TEXT NOT NULL,
    "directory" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "text_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bookmarks_fileName_directory_idx" ON "bookmarks"("fileName", "directory");

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_fileName_directory_key" ON "bookmarks"("fileName", "directory");

-- CreateIndex
CREATE INDEX "text_entries_fileName_directory_idx" ON "text_entries"("fileName", "directory");

-- CreateIndex
CREATE UNIQUE INDEX "text_entries_fileName_directory_key" ON "text_entries"("fileName", "directory");
