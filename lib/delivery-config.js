/**
 * Centralized logistics and delivery configuration.
 */
export const DELIVERY_CONFIG = {
  // Grace distance allowed beyond the seller's max delivery range before marking as Out of Range.
  // This buffer accounts for real-world route variance and standard logistical flexibility.
  // The system will also use Math.floor() on the final distance to absorb GPS jitter and decimals.
  DISTANCE_TOLERANCE_KM: 5,
};
