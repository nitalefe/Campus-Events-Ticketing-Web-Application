const { describe, test, expect, beforeEach } = require('@jest/globals');

/**
 * Format user role for display on profile
 * Extracted from profile.html logic 
 * Capitalizes first letter of role for display
 */
function formatRoleForDisplay(role) {
  if (!role || typeof role !== 'string') {
    return 'User';
  }

  // Capitalize first letter
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Get user profile display data including role
 * Based on profile.html loadUserProfile logic
 */
function getUserProfileDisplayData(userData) {
  if (!userData) {
    throw new Error('User data is required');
  }

  return {
    fullname: userData.fullname || 'Unknown User',
    email: userData.email || '',
    role: formatRoleForDisplay(userData.role),
    bio: userData.bio || '',
    phone: userData.phone || '',
    selectedAvatar: userData.selectedAvatar || userData.avatarUrl || null
  };
}

describe('Profile Role Display - User Story #1 (Profiles)', () => {

  describe('formatRoleForDisplay', () => {
    test('should capitalize student role', () => {
      const result = formatRoleForDisplay('student');
      expect(result).toBe('Student');
    });

    test('should capitalize organizer role', () => {
      const result = formatRoleForDisplay('organizer');
      expect(result).toBe('Organizer');
    });

    test('should capitalize admin role', () => {
      const result = formatRoleForDisplay('admin');
      expect(result).toBe('Admin');
    });

    test('should handle already capitalized role', () => {
      const result = formatRoleForDisplay('Student');
      expect(result).toBe('Student');
    });

    test('should return "User" for null role', () => {
      const result = formatRoleForDisplay(null);
      expect(result).toBe('User');
    });

    test('should return "User" for undefined role', () => {
      const result = formatRoleForDisplay(undefined);
      expect(result).toBe('User');
    });

    test('should return "User" for empty string', () => {
      const result = formatRoleForDisplay('');
      expect(result).toBe('User');
    });
  });

  describe('getUserProfileDisplayData', () => {
    let studentData;
    let organizerData;
    let adminData;

    beforeEach(() => {
      studentData = {
        uid: 'student123',
        fullname: 'John Doe',
        email: 'john@example.com',
        role: 'student',
        bio: 'I love events!',
        phone: '+1 (555) 123-4567',
        selectedAvatar: 'assets/images/avatars/avatar1.png'
      };

      organizerData = {
        uid: 'org456',
        fullname: 'Jane Smith',
        email: 'jane@example.com',
        role: 'organizer',
        bio: 'Event coordinator',
        organization: 'Concordia Events',
        selectedAvatar: 'assets/images/avatars/avatar2.png'
      };

      adminData = {
        uid: 'admin789',
        fullname: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        bio: 'System administrator'
      };
    });

    test('should display student role correctly on profile', () => {
      const result = getUserProfileDisplayData(studentData);

      expect(result.role).toBe('Student');
      expect(result.fullname).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
    });

    test('should display organizer role correctly on profile', () => {
      const result = getUserProfileDisplayData(organizerData);

      expect(result.role).toBe('Organizer');
      expect(result.fullname).toBe('Jane Smith');
      expect(result.email).toBe('jane@example.com');
    });

    test('should display admin role correctly on profile', () => {
      const result = getUserProfileDisplayData(adminData);

      expect(result.role).toBe('Admin');
      expect(result.fullname).toBe('Admin User');
    });

    test('should include all profile information with role', () => {
      const result = getUserProfileDisplayData(studentData);

      expect(result).toEqual({
        fullname: 'John Doe',
        email: 'john@example.com',
        role: 'Student',
        bio: 'I love events!',
        phone: '+1 (555) 123-4567',
        selectedAvatar: 'assets/images/avatars/avatar1.png'
      });
    });

    test('should handle missing optional fields but still show role', () => {
      const minimalData = {
        uid: 'user123',
        fullname: 'Test User',
        email: 'test@example.com',
        role: 'student'
      };

      const result = getUserProfileDisplayData(minimalData);

      expect(result.role).toBe('Student');
      expect(result.bio).toBe('');
      expect(result.phone).toBe('');
      expect(result.selectedAvatar).toBeNull();
    });

    test('should default to "User" role when role is missing', () => {
      const dataWithoutRole = {
        uid: 'user123',
        fullname: 'Test User',
        email: 'test@example.com'
      };

      const result = getUserProfileDisplayData(dataWithoutRole);

      expect(result.role).toBe('User');
    });

    test('should throw error when userData is null', () => {
      expect(() => {
        getUserProfileDisplayData(null);
      }).toThrow('User data is required');
    });

    test('should throw error when userData is undefined', () => {
      expect(() => {
        getUserProfileDisplayData(undefined);
      }).toThrow('User data is required');
    });

    test('should handle user with avatarUrl instead of selectedAvatar', () => {
      const userWithAvatarUrl = {
        uid: 'user123',
        fullname: 'Test User',
        email: 'test@example.com',
        role: 'student',
        avatarUrl: 'assets/images/avatars/avatar3.png'
      };

      const result = getUserProfileDisplayData(userWithAvatarUrl);

      expect(result.selectedAvatar).toBe('assets/images/avatars/avatar3.png');
      expect(result.role).toBe('Student');
    });
  });

  describe('Role Display Integration', () => {
    test('should display different roles for different user types', () => {
      const users = [
        { fullname: 'Student User', email: 'student@test.com', role: 'student' },
        { fullname: 'Organizer User', email: 'org@test.com', role: 'organizer' },
        { fullname: 'Admin User', email: 'admin@test.com', role: 'admin' }
      ];

      const results = users.map(user => getUserProfileDisplayData(user));

      expect(results[0].role).toBe('Student');
      expect(results[1].role).toBe('Organizer');
      expect(results[2].role).toBe('Admin');
    });
  });
});

module.exports = { formatRoleForDisplay, getUserProfileDisplayData };