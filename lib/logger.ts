type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private logLevel: LogLevel = 'info';

  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  debug(...args: any[]) {
    if (this.shouldLog('debug')) {
      console.debug(...args);
    }
  }

  info(...args: any[]) {
    if (this.shouldLog('info')) {
      console.info(...args);
    }
  }

  warn(...args: any[]) {
    if (this.shouldLog('warn')) {
      console.warn(...args);
    }
  }

  error(...args: any[]) {
    if (this.shouldLog('error')) {
      console.error(...args);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }
}

export const logger = new Logger();
