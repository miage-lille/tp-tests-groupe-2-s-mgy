import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { exec } from 'child_process';
import { promisify } from 'util';
import Fastify from 'fastify';
import { container as appContainer, AppContainer } from 'src/container';
import { webinarRoutes } from 'src/webinars/routes';
import { Webinar } from 'src/webinars/entities/webinar.entity';

const asyncExec = promisify(exec);

jest.setTimeout(120_000);

describe('E2E — change seats endpoint', () => {
  let pg: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let app: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    pg = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .withUsername('user_test')
      .withPassword('password_test')
      .withExposedPorts(5432)
      .start();

    const dbUrl = pg.getConnectionUri();
    prisma = new PrismaClient({
      datasources: { db: { url: dbUrl } },
    });

    await asyncExec(`DATABASE_URL=${dbUrl} npx prisma migrate deploy`);
    await prisma.$connect();

    // Initialize our AppContainer with this prisma client
    const ac: AppContainer = appContainer;
    ac.init(prisma);

    // Build fastify app and register routes
    app = Fastify();
    await webinarRoutes(app, ac);
    await app.ready();
  });

  beforeEach(async () => {
    await prisma.webinar.deleteMany();
  });

  afterAll(async () => {
    await app.close();
    await pg.stop({ timeout: 1000 });
    await prisma.$disconnect();
  });

  it('POST /webinars/:id/seats updates seats and returns 200', async () => {
    // Arrange: insert a webinar
    await prisma.webinar.create({
      data: {
        id: 'e2e-1',
        // The route uses a fixed test user id ('test-user'), so make the webinar organizer match
        organizerId: 'test-user',
        title: 'E2E Webinar',
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-01T01:00:00Z'),
        seats: 5,
      },
    });

    // Act: call the endpoint using fastify.inject
    const response = await app.inject({
      method: 'POST',
      url: '/webinars/e2e-1/seats',
      payload: { seats: '10' },
    });

    // Assert: HTTP response
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: 'Seats updated' });

    // Assert: DB updated
    const db = await prisma.webinar.findUnique({ where: { id: 'e2e-1' } });
    expect(db).not.toBeNull();
    expect(db?.seats).toBe(10);
  });
});
