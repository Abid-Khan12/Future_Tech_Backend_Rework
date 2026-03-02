import winston, { log } from "winston";

const logger = winston.createLogger({
   level: process.env.NODE_ENV === "production" ? "info" : "debug",

   format: winston.format.combine(
      winston.format.errors({ stack: true }),

      // Built-in timestamp formatter
      winston.format.timestamp({
         format: "YYYY-MM-DD hh:mm a",
      }),

      // Colorize output
      winston.format.colorize({ all: true }),

      // Custom log structure
      winston.format.printf(({ timestamp, level, message, stack }) => {
         return `[${timestamp}] ${level}: ${stack || message}`;
      }),
   ),

   transports: [new winston.transports.Console()],
});

export default logger