import compress from '@fastify/compress';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { LoggerService } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import Fastify, { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { join } from 'path';

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
  }
}

export const fastifyConfig = async (
  logger: LoggerService,
): Promise<FastifyAdapter> => {
  // Fastify
  const instance: FastifyInstance = Fastify({
    trustProxy: true,
    bodyLimit: 48 * 1024 * 1024,
    disableRequestLogging: true,
    maxParamLength: 2048,
  });

  // CORS
  await instance.register(cors, {
    origin: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Requested-With',
      'X-Forwarded-For',
      'X-Real-IP',
    ],
    exposedHeaders: [],
    credentials: true,
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Helmet
  await instance.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        styleSrc: [`'self'`, `'unsafe-inline'`],
        imgSrc: [`'self'`, 'data:', 'https:'],
        scriptSrc: [`'self'`, `'unsafe-inline'`, 'https://cdn.jsdelivr.net'],
      },
    },
    xssFilter: true,
    hidePoweredBy: true,
    frameguard: { action: 'deny' },
    hsts: { maxAge: 31536000, includeSubDomains: true },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });

  // Rate Limit
  const allowList = process.env.SERVICE_WHITELIST_IPS
    ? process.env.SERVICE_WHITELIST_IPS.split(',')
        .map((ip) => ip.trim())
        .filter(Boolean)
    : [];

  await instance.register(rateLimit, {
    global: true,
    max: 512,
    timeWindow: '1 minute',
    ...(allowList.length > 0 && { allowList }),
    keyGenerator: (req) => `${req.ip}:${req.method}`,
    errorResponseBuilder: (_req, context) => ({
      message: `Ошибка ограничения запросов. Попробуйте через ${Math.ceil(context.ttl / 1000)} секунд.`,
    }),
  });

  // Compress
  await instance.register(compress);

  // Request id + logging incoming requests
  instance.addHook('onRequest', (request, _reply, done) => {
    request.requestId = nanoid(12);
    logger.log(
      `→ ${request.method} ${request.url} ip=${request.ip} request_id=${request.requestId}`,
      'HTTP',
    );
    done();
  });

  // Pre Handler
  instance.addHook('preHandler', (request, _reply, done) => {
    if (!request.body) {
      done();

      return;
    }

    const contentType = request.headers['content-type'] ?? '';

    if (contentType.includes('multipart/form-data')) {
      logger.log(
        `Body request_id=${request.requestId}: [multipart/form-data]`,
        'HTTP',
      );
      done();

      return;
    }

    try {
      logger.log(
        `Body request_id=${request.requestId}: ${JSON.stringify(request.body)}`,
        'HTTP',
      );
    } catch {
      logger.log(
        `Body request_id=${request.requestId}: [body omitted: not JSON-serializable]`,
        'HTTP',
      );
    }

    done();
  });

  // Static: GET /public/static/<путь>
  await instance.register(fastifyStatic, {
    root: join(process.cwd(), 'public', 'static'),
    prefix: '/public/static',
    decorateReply: false,
  });

  return new FastifyAdapter(instance);
};
