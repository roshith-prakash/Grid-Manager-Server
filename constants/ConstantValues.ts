// Default driver price - for drivers who exceed the 20 drivers limit.
export const DEFAULT_DRIVER_PRICE = 5;

// Default constructor price - for constructors who exceed the 10 constructors limit.
export const DEFAULT_CONSTRUCTOR_PRICE = 15;

// Decreasing price scale for the top 20 drivers
export const driverPriceScale = [
  30, 28, 26, 25, 22, 20, 19, 18, 17, 16, 15, 14, 13, 12, 10, 9, 8, 7, 6, 5,
];

// Decreasing price scale for the top 10 constructors
export const constructorPriceScale = [40, 38, 35, 32, 30, 28, 25, 22, 20, 15];
