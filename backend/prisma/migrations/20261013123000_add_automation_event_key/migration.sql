/*
  Warnings:

  - A unique constraint covering the columns `[automationId,claveEvento]` on the table `AutomationExecution` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `claveEvento` to the `AutomationExecution` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AutomationExecution" ADD COLUMN     "claveEvento" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AutomationExecution_automationId_claveEvento_key" ON "AutomationExecution"("automationId", "claveEvento");
