import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from './profile.service';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { UserProfile } from '@app/entities/user-profile.entity';
import { NotFoundException } from '@nestjs/common';

const mockProfileRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  getEntityManager: jest.fn(() => ({
    persistAndFlush: jest.fn(),
    flush: jest.fn(),
  })),
};

describe('ProfileService', () => {
  let service: ProfileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: getRepositoryToken(UserProfile),
          useValue: mockProfileRepository,
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyProfile', () => {
    it('should return a user profile successfully', async () => {
      // Arrange
      const inputUserId = 1;
      const inputTenantId = 1;
      const expectedProfile = {
        id: 1,
        name: 'Test User',
        education: 'BSc',
        yearsExperience: 2,
      };
      mockProfileRepository.findOne.mockResolvedValue(expectedProfile);

      // Act
      const actualProfile = await service.getMyProfile(
        inputUserId,
        inputTenantId,
      );

      // Assert
      expect(mockProfileRepository.findOne).toHaveBeenCalledWith({
        user: inputUserId,
        tenant: inputTenantId,
      });
      expect(actualProfile).toEqual(expectedProfile);
    });

    it('should throw NotFoundException if profile does not exist', async () => {
      // Arrange
      const inputUserId = 2;
      const inputTenantId = 1;
      mockProfileRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getMyProfile(inputUserId, inputTenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('parseResume', () => {
    it('should extract skills from plain resume text', () => {
      // Arrange
      const inputResumeText = 'I am a software engineer skilled in python.';
      const expectedSkills = ['Python'];

      // Act
      const actualResult = service.parseResume(inputResumeText);

      // Assert
      expect(actualResult.skills).toEqual(expectedSkills);
    });
  });
});
