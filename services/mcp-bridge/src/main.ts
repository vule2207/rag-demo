import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // Disable default logger to protect stdout for MCP communication.
  // Only allow errors and warnings to be printed to stderr.
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });
  
  // Set global prefix for API routing
  app.setGlobalPrefix('api');

  // Enable CORS so your React/Angular frontend can communicate with this API
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  // Start the HTTP server on port 3000
  await app.listen(3000, () => {
    // Strictly use stderr to announce the server status
    process.stderr.write('✅ Configuration UI API is running on http://localhost:3000\n');
  });
}
bootstrap();