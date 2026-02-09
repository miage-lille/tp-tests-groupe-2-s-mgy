import { PrismaClient } from '@prisma/client';
import {
	PostgreSqlContainer,
	StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { exec } from 'child_process';
import { PrismaWebinarRepository } from 'src/webinars/adapters/webinar-repository.prisma';
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { promisify } from 'util';

const asyncExec = promisify(exec);

jest.setTimeout(120_000);

describe('PrismaWebinarRepository', () => {
	let container: StartedPostgreSqlContainer;
	let prismaClient: PrismaClient;
	let repository: PrismaWebinarRepository;

	beforeAll(async () => {
		// Start a dedicated postgres container for tests
		container = await new PostgreSqlContainer()
			.withDatabase('test_db')
			.withUsername('user_test')
			.withPassword('password_test')
			.withExposedPorts(5432)
			.start();

		const dbUrl = container.getConnectionUri();
		prismaClient = new PrismaClient({
			datasources: {
				db: { url: dbUrl },
			},
		});

		// Run prisma migrations to populate the database schema
		await asyncExec(`DATABASE_URL=${dbUrl} npx prisma migrate deploy`);

		return prismaClient.$connect();
	});

	beforeEach(async () => {
		repository = new PrismaWebinarRepository(prismaClient);
		// Clean tables to ensure test isolation
		await prismaClient.webinar.deleteMany();
		await prismaClient.$executeRawUnsafe('DELETE FROM "Webinar" CASCADE');
	});

	afterAll(async () => {
		await container.stop({ timeout: 1000 });
		return prismaClient.$disconnect();
	});

	it('creates and finds a webinar', async () => {
		const webinar = new Webinar({
			id: 'test-id-1',
			organizerId: 'org-1',
			title: 'Integration test webinar',
			startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // in 7 days
			endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 8),
			seats: 10,
		});

		await repository.create(webinar);

		const found = await repository.findById('test-id-1');
		expect(found).not.toBeNull();
		expect(found?.props.id).toBe('test-id-1');
		expect(found?.props.title).toBe('Integration test webinar');
	});

	describe('Scenario : repository.create', () => {
		it('should create a webinar', async () => {
			// ARRANGE
			const webinar = new Webinar({
				id: 'webinar-id',
				organizerId: 'organizer-id',
				title: 'Webinar title',
				startDate: new Date('2022-01-01T00:00:00Z'),
				endDate: new Date('2022-01-01T01:00:00Z'),
				seats: 100,
			});

			// ACT
			await repository.create(webinar);

			// ASSERT (use prismaClient directly to isolate repository)
			const maybeWebinar = await prismaClient.webinar.findUnique({
				where: { id: 'webinar-id' },
			});
			expect(maybeWebinar).toEqual({
				id: 'webinar-id',
				organizerId: 'organizer-id',
				title: 'Webinar title',
				startDate: new Date('2022-01-01T00:00:00.000Z'),
				endDate: new Date('2022-01-01T01:00:00.000Z'),
				seats: 100,
			});
		});
	});

	describe('Scenario : repository.findById', () => {
		it('should return a webinar entity when present', async () => {
			// ARRANGE (insert directly with prisma)
			await prismaClient.webinar.create({
				data: {
					id: 'find-id',
					organizerId: 'org-find',
					title: 'Find webinar',
					startDate: new Date('2022-02-01T00:00:00Z'),
					endDate: new Date('2022-02-01T01:00:00Z'),
					seats: 5,
				},
			});

			// ACT
			const found = await repository.findById('find-id');

			// ASSERT
			expect(found).not.toBeNull();
			expect(found?.props.id).toBe('find-id');
			expect(found?.props.title).toBe('Find webinar');
			expect(found?.props.seats).toBe(5);
		});
	});

	describe('Scenario : repository.update', () => {
		it('should update webinar data', async () => {
			// ARRANGE (insert original)
			await prismaClient.webinar.create({
				data: {
					id: 'update-id',
					organizerId: 'org-update',
					title: 'Old title',
					startDate: new Date('2022-03-01T00:00:00Z'),
					endDate: new Date('2022-03-01T01:00:00Z'),
					seats: 20,
				},
			});

			// Prepare entity with updated values
			const updated = new Webinar({
				id: 'update-id',
				organizerId: 'org-update',
				title: 'New title',
				startDate: new Date('2022-03-02T00:00:00Z'),
				endDate: new Date('2022-03-02T01:00:00Z'),
				seats: 30,
			});

			// ACT
			await repository.update(updated);

			// ASSERT (check DB directly)
			const maybeWebinar = await prismaClient.webinar.findUnique({
				where: { id: 'update-id' },
			});
			expect(maybeWebinar).not.toBeNull();
			expect(maybeWebinar?.title).toBe('New title');
			expect(maybeWebinar?.seats).toBe(30);
		});
	});
});