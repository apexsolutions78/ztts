-- 0024: Fix corrupted per-passenger pricing values
-- Prices were saved as raw PKR instead of USD (not divided by exchange rate)
-- Divides by PKR rate to restore correct USD values
-- Only fixes rows where per-category prices are clearly in local currency (>10000)

SET @rate = 278.5;

UPDATE flight_bookings
SET
  price_per_adult = ROUND(price_per_adult / @rate, 6),
  price_per_child = ROUND(price_per_child / @rate, 6),
  price_per_infant = ROUND(price_per_infant / @rate, 6),
  baggage_fee = ROUND(baggage_fee / @rate, 6)
WHERE price_per_adult > 10000
   OR price_per_child > 10000
   OR price_per_infant > 10000
   OR baggage_fee > 10000;
