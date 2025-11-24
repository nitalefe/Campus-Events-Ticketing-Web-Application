const { describe, test, expect } = require('@jest/globals');

/**
 * Filter events that a student is attending
 * Extracted from public-profile.html loadStudentEvents logic for testing
 * This ensures all attending events appear on the student's profile
 */
function getStudentAttendingEvents(allEvents, studentId) {
  if (!Array.isArray(allEvents)) {
    throw new Error('Events must be an array');
  }

  if (!studentId || typeof studentId !== 'string') {
    throw new Error('Student ID is required');
  }

  const attendingEvents = [];

  // Check each event's attendees list
  for (const event of allEvents) {
    if (!event.attendees || !Array.isArray(event.attendees)) {
      continue; // Skip events without attendees array
    }

    // Check if student is in the attendees list
    if (event.attendees.includes(studentId)) {
      attendingEvents.push(event);
    }
  }

  return attendingEvents;
}

describe('Student Attending Events - User Profile Display', () => {

  let allEvents;
  const studentId = 'student123';

  beforeEach(() => {
    allEvents = [
      {
        id: 'event1',
        eventName: 'Soccer Match',
        category: 'sports',
        eventDateTime: new Date('2025-12-01'),
        attendees: ['student123', 'student456']
      },
      {
        id: 'event2',
        eventName: 'Rock Concert',
        category: 'music',
        eventDateTime: new Date('2025-12-05'),
        attendees: ['student123', 'student789']
      },
      {
        id: 'event3',
        eventName: 'Tech Conference',
        category: 'tech',
        eventDateTime: new Date('2025-12-10'),
        attendees: ['student456', 'student789']
      },
      {
        id: 'event4',
        eventName: 'Art Exhibition',
        category: 'arts',
        eventDateTime: new Date('2025-11-30'),
        attendees: ['student123']
      }
    ];
  });

  test('should return all events student is attending', () => {
    const result = getStudentAttendingEvents(allEvents, studentId);

    expect(result).toHaveLength(3);
    expect(result.map(e => e.id)).toContain('event1');
    expect(result.map(e => e.id)).toContain('event2');
    expect(result.map(e => e.id)).toContain('event4');
  });

  test('should not return events student is not attending', () => {
    const result = getStudentAttendingEvents(allEvents, studentId);

    expect(result.map(e => e.id)).not.toContain('event3');
  });

  test('should return empty array when student is not attending any events', () => {
    const result = getStudentAttendingEvents(allEvents, 'student999');

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  test('should handle events without attendees array', () => {
    const eventsWithMissingAttendees = [
      { id: 'event1', eventName: 'Event 1', attendees: ['student123'] },
      { id: 'event2', eventName: 'Event 2' }, // No attendees
      { id: 'event3', eventName: 'Event 3', attendees: null }, // Null attendees
      { id: 'event4', eventName: 'Event 4', attendees: ['student123'] }
    ];

    const result = getStudentAttendingEvents(eventsWithMissingAttendees, studentId);

    expect(result).toHaveLength(2);
    expect(result.map(e => e.id)).toEqual(['event1', 'event4']);
  });

  test('should throw error when events is not an array', () => {
    expect(() => {
      getStudentAttendingEvents(null, studentId);
    }).toThrow('Events must be an array');

    expect(() => {
      getStudentAttendingEvents('not an array', studentId);
    }).toThrow('Events must be an array');
  });

  test('should throw error when studentId is missing', () => {
    expect(() => {
      getStudentAttendingEvents(allEvents, null);
    }).toThrow('Student ID is required');

    expect(() => {
      getStudentAttendingEvents(allEvents, '');
    }).toThrow('Student ID is required');
  });

  test('should handle empty events array', () => {
    const result = getStudentAttendingEvents([], studentId);

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  test('should correctly identify student in multiple events', () => {
    const result = getStudentAttendingEvents(allEvents, studentId);
    
    const eventNames = result.map(e => e.eventName);
    expect(eventNames).toContain('Soccer Match');
    expect(eventNames).toContain('Rock Concert');
    expect(eventNames).toContain('Art Exhibition');
  });

  test('should preserve all event data for attending events', () => {
    const result = getStudentAttendingEvents(allEvents, studentId);

    const soccerEvent = result.find(e => e.id === 'event1');
    expect(soccerEvent.eventName).toBe('Soccer Match');
    expect(soccerEvent.category).toBe('sports');
    expect(soccerEvent.attendees).toContain('student123');
  });
});

module.exports = { getStudentAttendingEvents };