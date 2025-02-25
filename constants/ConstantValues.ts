// Default driver price - for drivers who exceed the 20 drivers limit.
export const DEFAULT_DRIVER_PRICE = 4;

// Default constructor price - for constructors who exceed the 10 constructors limit.
export const DEFAULT_CONSTRUCTOR_PRICE = 10;

// Decreasing price scale for the top 20 drivers
export const driverPriceScale = [
  35, 33, 31, 29, 27, 24, 22, 20, 18, 16, 14, 12, 11, 10, 9, 8, 7, 6, 5, 4,
];

// Decreasing price scale for the top 10 constructors
export const constructorPriceScale = [40, 37, 34, 30, 27, 24, 21, 18, 15, 12];
