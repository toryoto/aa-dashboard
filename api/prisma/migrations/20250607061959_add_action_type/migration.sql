/*
  Warnings:

  - Added the required column `actionType` to the `user_operations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "user_operations" ADD COLUMN     "actionType" TEXT NOT NULL;
