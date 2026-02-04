export const SENSOR_RANGES = {
  T:   { min: -10, max: 80 },
  H:   { min: 0,   max: 100 },
  HI:  { min: -10, max: 90 },
  gas: { min: 0,   max: 100 },
  base:{ min: 0,   max: 100 },

  luz: { min: 0,   max: 1000 }, // <- NUEVO (típico ADC ESP32)
};
