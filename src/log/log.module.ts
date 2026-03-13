export class LogModule {
  info(message: string) {
    console.log(`[${new Date().toISOString()}] INFO  ${message}`);
  }

  error(message: string) {
    console.error(`[${new Date().toISOString()}] ERROR ${message}`);
  }
}
