import winston from "winston";
import path from "path";

// 📁 Emplacement du fichier log
const logDir = path.join(__dirname, "../../logs");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(
      ({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] ${message}`
    )
  ),
  transports: [
    new winston.transports.File({ filename: `${logDir}/errors.log`, level: "error" }),
    new winston.transports.File({ filename: `${logDir}/emails.log` }),
  ],
});

// 🧾 En développement, on log aussi dans la console
if (process.env.NODE_ENV !== "production") {
  logger.add(new winston.transports.Console({ format: winston.format.simple() }));
}

export default logger;
