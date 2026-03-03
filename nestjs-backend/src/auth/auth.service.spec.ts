import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
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

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
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
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const actualResult = await authService.validateUser(
        inputEmail,
        inputPass,
      );

      // Assert
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(inputEmail);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        inputPass,
        mockUser.hashedPassword,
      );
      expect(actualResult).toEqual({
        id: 1,
        email: inputEmail,
        isActive: true,
      });
    });

    it('should throw UnauthorizedException if user account is deactivated', async () => {
      // Arrange
      const inputEmail = 'test@test.com';
      const inputPass = 'password123';
      const mockUser = {
        id: 1,
        email: inputEmail,
        hashedPassword: 'hashed_password',
        isActive: false, // Deactivated
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(
        authService.validateUser(inputEmail, inputPass),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return null if password does not match', async () => {
      // Arrange
      const inputEmail = 'test@test.com';
      const inputPass = 'wrongpassword';
      const mockUser = {
        id: 1,
        email: inputEmail,
        hashedPassword: 'hashed_password',
        isActive: true,
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const actualResult = await authService.validateUser(
        inputEmail,
        inputPass,
      );

      // Assert
      expect(actualResult).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access_token and refresh_token', () => {
      // Arrange
      const inputUser = { id: 1 } as User;
      const expectedToken = 'jwt_token_string';
      mockJwtService.sign.mockReturnValue(expectedToken);

      // Act
      const actualResult = authService.login(inputUser);

      // Assert
      expect(mockJwtService.sign).toHaveBeenCalledWith({ sub: '1' });
      expect(actualResult).toEqual({
        access_token: expectedToken,
        refresh_token: expectedToken,
        token_type: 'bearer',
      });
    });
  });
});
