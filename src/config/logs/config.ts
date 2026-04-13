import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import TransportStream = require('winston-transport');

/**
 * Кастомный формат для структурированных логов с метаданными
 */
const nestLikeFormat = winston.format.printf(
  ({ level, message, timestamp, context, ...meta }) => {
    return `${timestamp} [${level}] ${context ? `[${context}] ` : ''}${message}${
      Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
    }`;
  },
);

/**
 * Конфигурация логгера с ротацией файлов и хранением 30 дней
 */
export function logsConfig() {
  const isProd = process.env.NODE_ENV === 'production';
  const level = isProd ? 'info' : 'debug';

  // Базовый формат с timestamp
  const baseFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
  );

  // Консольный транспорт
  const consoleTransport = new winston.transports.Console({
    level,
    handleExceptions: true,
    format: isProd
      ? winston.format.combine(baseFormat, nestLikeFormat)
      : winston.format.combine(
          baseFormat,
          winston.format.colorize({ all: true }),
          nestLikeFormat,
        ),
  });

  // Файловые транспорты (всегда включены)
  const fileTransport = new winston.transports.DailyRotateFile({
    dirname: 'logs',
    filename: '%DATE%-app.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxFiles: '14d',
    level,
    handleExceptions: true,
    format: winston.format.combine(baseFormat, winston.format.json()),
  });

  // Отдельный транспорт для ошибок
  const errorFileTransport = new winston.transports.DailyRotateFile({
    dirname: 'logs',
    filename: '%DATE%-app.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxFiles: '14d',
    level: 'error',
    handleExceptions: true,
    format: winston.format.combine(baseFormat, winston.format.json()),
  });

  const transports: TransportStream[] = [
    consoleTransport,
    fileTransport,
    errorFileTransport,
  ];

  // Создаем логгер
  const logger = WinstonModule.createLogger({
    level,
    format: baseFormat,
    transports,
    exitOnError: false,
  });

  // Обработка необработанных исключений и отклоненных промисов
  if (isProd) {
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error, stack: error.stack });
      setTimeout(() => process.exit(1), 1000);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled promise rejection', { reason });
    });
  }

  return logger;
}
