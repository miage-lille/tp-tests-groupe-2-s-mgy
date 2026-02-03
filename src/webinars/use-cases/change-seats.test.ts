import { InMemoryWebinarRepository } from 'src/webinars/adapters/webinar-repository.in-memory';
import { ChangeSeats } from './change-seats';
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { WebinarNotFoundException } from 'src/webinars/exceptions/webinar-not-found';
import { testUser } from 'src/users/tests/user-seeds';

// Tests unitaires
describe('Feature : Change seats', () => {
  // Initialisation de nos tests, boilerplates...
  describe('Scenario: Happy path', () => {
    // Code commun à notre scénario : payload...
    const payload = {
      user: testUser.alice,
      webinarId: 'webinar-id',
      seats: 200,
    };

    let webinarRepository: InMemoryWebinarRepository;
    let useCase: ChangeSeats;

    const webinar = new Webinar({
      id: 'webinar-id',
      organizerId: testUser.alice.props.id,
      title: 'Webinar title',
      startDate: new Date('2024-01-01T00:00:00Z'),
      endDate: new Date('2024-01-01T01:00:00Z'),
      seats: 100,
    });

    beforeEach(() => {
      webinarRepository = new InMemoryWebinarRepository([webinar]);
      useCase = new ChangeSeats(webinarRepository);
    });

    it('should change the number of seats for a webinar', async () => {
      // ACT
      await useCase.execute(payload);
      // ASSERT
      const updatedWebinar = await webinarRepository.findById('webinar-id');
      expect(updatedWebinar?.props.seats).toEqual(200);
    });
  });

  describe('Scenario: webinar does not exist', () => {
    const payload = {
      user: testUser.alice,
      webinarId: 'unknown-webinar',
      seats: 200,
    };

    let webinarRepository: InMemoryWebinarRepository;
    let useCase: ChangeSeats;

    const webinar = new Webinar({
      id: 'webinar-id',
      organizerId: testUser.alice.props.id,
      title: 'Webinar title',
      startDate: new Date('2024-01-01T00:00:00Z'),
      endDate: new Date('2024-01-01T01:00:00Z'),
      seats: 100,
    });

    beforeEach(() => {
      webinarRepository = new InMemoryWebinarRepository([webinar]);
      useCase = new ChangeSeats(webinarRepository);
    });

    it('should fail with WebinarNotFoundException and not modify existing webinar', async () => {
      await expect(useCase.execute(payload)).rejects.toThrow(
        WebinarNotFoundException,
      );

      const unchanged = webinarRepository.findByIdSync('webinar-id');
      expect(unchanged?.props.seats).toEqual(100);
    });
  });
});