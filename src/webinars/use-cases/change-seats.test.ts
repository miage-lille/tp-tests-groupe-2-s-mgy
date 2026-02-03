import { InMemoryWebinarRepository } from 'src/webinars/adapters/webinar-repository.in-memory';
import { ChangeSeats } from './change-seats';
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { WebinarNotFoundException } from 'src/webinars/exceptions/webinar-not-found';
import { WebinarNotOrganizerException } from 'src/webinars/exceptions/webinar-not-organizer';
import { WebinarReduceSeatsException } from 'src/webinars/exceptions/webinar-reduce-seats';
import { WebinarTooManySeatsException } from 'src/webinars/exceptions/webinar-too-many-seats';
import { testUser } from 'src/users/tests/user-seeds';

// Tests unitaires
describe('Feature : Change seats', () => {
  // shared fixtures / helpers
  let webinarRepository: InMemoryWebinarRepository;
  let useCase: ChangeSeats;

  function createDefaultWebinar() {
    return new Webinar({
      id: 'webinar-id',
      organizerId: testUser.alice.props.id,
      title: 'Webinar title',
      startDate: new Date('2024-01-01T00:00:00Z'),
      endDate: new Date('2024-01-01T01:00:00Z'),
      seats: 100,
    });
  }

  function expectWebinarToRemainUnchanged() {
    const webinar = webinarRepository.findByIdSync('webinar-id');
    expect(webinar?.props.seats).toEqual(100);
  }

  async function whenUserChangeSeatsWith(payload: any) {
    return useCase.execute(payload);
  }

  async function thenUpdatedWebinarSeatsShouldBe(expected: number) {
    const updated = await webinarRepository.findById('webinar-id');
    expect(updated?.props.seats).toEqual(expected);
  }

  // Initialisation de nos tests, boilerplates...
  describe('Scenario: Happy path', () => {
    // Code commun à notre scénario : payload...
    const payload = {
      user: testUser.alice,
      webinarId: 'webinar-id',
      seats: 200,
    };

    beforeEach(() => {
      webinarRepository = new InMemoryWebinarRepository([createDefaultWebinar()]);
      useCase = new ChangeSeats(webinarRepository);
    });

    it('should change the number of seats for a webinar', async () => {
      // ACT
      await whenUserChangeSeatsWith(payload);
      // ASSERT
      await thenUpdatedWebinarSeatsShouldBe(200);
    });
  });

  describe('Scenario: webinar does not exist', () => {
    const payload = {
      user: testUser.alice,
      webinarId: 'unknown-webinar',
      seats: 200,
    };

    beforeEach(() => {
      webinarRepository = new InMemoryWebinarRepository([createDefaultWebinar()]);
      useCase = new ChangeSeats(webinarRepository);
    });

    it('should fail with WebinarNotFoundException and not modify existing webinar', async () => {
      await expect(whenUserChangeSeatsWith(payload)).rejects.toThrow(
        WebinarNotFoundException,
      );

      expectWebinarToRemainUnchanged();
    });
  });

  describe("Scenario: update the webinar of someone else", () => {
    const payload = {
      user: testUser.bob,
      webinarId: 'webinar-id',
      seats: 200,
    };

    beforeEach(() => {
      webinarRepository = new InMemoryWebinarRepository([createDefaultWebinar()]);
      useCase = new ChangeSeats(webinarRepository);
    });

    it('should fail with WebinarNotOrganizerException and not modify webinar', async () => {
      await expect(whenUserChangeSeatsWith(payload)).rejects.toThrow(
        WebinarNotOrganizerException,
      );

      expectWebinarToRemainUnchanged();
    });
  });

  describe('Scenario: change seat to an inferior number', () => {
    const payload = {
      user: testUser.alice,
      webinarId: 'webinar-id',
      seats: 50,
    };

    beforeEach(() => {
      webinarRepository = new InMemoryWebinarRepository([createDefaultWebinar()]);
      useCase = new ChangeSeats(webinarRepository);
    });

    it('should fail with WebinarReduceSeatsException and not modify webinar', async () => {
      await expect(whenUserChangeSeatsWith(payload)).rejects.toThrow(
        WebinarReduceSeatsException,
      );

      expectWebinarToRemainUnchanged();
    });
  });

  describe('Scenario: change seat to a number > 1000', () => {
    const payload = {
      user: testUser.alice,
      webinarId: 'webinar-id',
      seats: 2000,
    };

    beforeEach(() => {
      webinarRepository = new InMemoryWebinarRepository([createDefaultWebinar()]);
      useCase = new ChangeSeats(webinarRepository);
    });

    it('should fail with WebinarTooManySeatsException and not modify webinar', async () => {
      await expect(whenUserChangeSeatsWith(payload)).rejects.toThrow(
        WebinarTooManySeatsException,
      );

      expectWebinarToRemainUnchanged();
    });
  });
});