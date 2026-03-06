import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/postgresql';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from '@app/entities/user.entity';

jest.mock('bcrypt');

const mockUsersService = {
  findByEmail: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('mock-refresh-secret-at-least-32-chars-long'),
};

const mockEntityManager = {
  flush: jest.fn().mockResolvedValue(undefined),
};

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EntityManager, useValue: mockEntityManager },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user without password if credentials are valid', async () => {
      // Arrange
      const inputEmail = 'test@test.com';
      const inputPass = 'password123';
      const mockUser = {
        id: 1,
        email: inputEmail,
        hashedPassword: 'hashed_password',
        isActive: true,
        lockedUntil: undefined,
        failedLoginAttempts: 0,
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const actualResult = await authService.validateUser(inputEmail, inputPass);

      // Assert
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(inputEmail);
      expect(bcrypt.compare).toHaveBeenCalledWith(inputPass, mockUser.hashedPassword);
      expect(actualResult).toEqual({ id: 1, email: inputEmail, isActive: true, lockedUntil: undefined, failedLoginAttempts: 0 });
      expect(mockEntityManager.flush).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException if account is temporarily locked', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        hashedPassword: 'hashed_password',
        isActive: true,
        lockedUntil: new Date(Date.now() + 10 * 60_000), // locked for 10 more minutes
        failedLoginAttempts: 5,
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        authService.validateUser('test@test.com', 'any'),
      ).rejects.toThrow(UnauthorizedException);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user account is deactivated', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        hashedPassword: 'hashed_password',
        isActive: false,
        lockedUntil: undefined,
        failedLoginAttempts: 0,
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(
        authService.validateUser('test@test.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return null and increment failedLoginAttempts if password does not match', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        hashedPassword: 'hashed_password',
        isActive: true,
        lockedUntil: undefined,
        failedLoginAttempts: 0,
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await authService.validateUser('test@test.com', 'wrongpassword');

      // Assert
      expect(result).toBeNull();
      expect(mockUser.failedLoginAttempts).toBe(1);
      expect(mockEntityManager.flush).toHaveBeenCalledTimes(1);
    });

    it('should lock account after 5 failed attempts', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        hashedPassword: 'hashed_password',
        isActive: true,
        lockedUntil: undefined,
        failedLoginAttempts: 4,
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      await authService.validateUser('test@test.com', 'wrong');

      // Assert
      expect(mockUser.failedLoginAttempts).toBe(5);
      expect(mockUser.lockedUntil).toBeInstanceOf(Date);
    });

    it('should return null if user is not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      const result = await authService.validateUser('nobody@test.com', 'pw');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access_token, refresh_token and token_type', () => {
      // Arrange
      const inputUser = { id: 1, email: 'test@test.com' } as User;
      mockJwtService.sign.mockReturnValue('jwt_token_string');

      // Act
      const result = authService.login(inputUser);

      // Assert
      expect(result).toEqual({
        access_token: 'jwt_token_string',
        refresh_token: 'jwt_token_string',
        token_type: 'bearer',
      });

      // Access token signed with typ: 'access'
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ typ: 'access' }),
      );
      // Refresh token signed with REFRESH_TOKEN_SECRET and typ: 'refresh'
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ typ: 'refresh' }),
        expect.objectContaining({ secret: expect.any(String), expiresIn: '7d' }),
      );
    });
  });
});
