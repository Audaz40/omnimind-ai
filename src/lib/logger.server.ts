/**
 * Enhanced logger with formatting
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  level: LogLevel;
  timestamp: Date;
  message: string;
  data?: any;
  stack?: string;
}

class Logger {
  private level: LogLevel = LogLevel.INFO;
  private listeners: ((entry: LogEntry) => void)[] = [];

  setLevel(level: LogLevel) {
    this.level = level;
  }

  onLog(listener: (entry: LogEntry) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private log(level: LogLevel, message: string, data?: any) {
    if (level < this.level) return;

    const entry: LogEntry = {
      level,
      timestamp: new Date(),
      message,
      data,
      stack: new Error().stack,
    };

    this.listeners.forEach((listener) => listener(entry));

    const prefix = `[${entry.timestamp.toISOString()}] ${LogLevel[level]}`;
    if (data) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }

  debug(message: string, data?: any) {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any) {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: any, data?: any) {
    const fullMessage = error ? `${message}: ${error.message}` : message;
    this.log(LogLevel.ERROR, fullMessage, { ...data, error });
  }

  group(label: string) {
    console.group(label);
    return () => console.groupEnd();
  }
}

export const logger = new Logger();
