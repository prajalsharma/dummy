-- AlterTable: add take_profit_price and stop_loss_price to Position
ALTER TABLE "Position" ADD COLUMN IF NOT EXISTS "takeProfitPrice" DECIMAL(20,6);
ALTER TABLE "Position" ADD COLUMN IF NOT EXISTS "stopLossPrice" DECIMAL(20,6);
