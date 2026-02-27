import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ProfileController } from '../src/profile/profile.controller';
import { ProfileService } from '../src/profile/profile.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../src/auth/guards/optional-jwt-auth.guard';

const mockGuard = {
  canActivate: (context: any) => {
    const req = context.switchToHttp().getRequest();
    req.user = { id: 1, email: 'test@test.com', tenant: { id: 1 } };
    return true;
  },
};

describe('ProfileController (e2e)', () => {
  let app: INestApplication;
  const mockProfileService = {
    getMyProfile: jest.fn(() => ({ id: 1, name: 'Alice' })),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        { provide: ProfileService, useValue: mockProfileService },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .overrideGuard(OptionalJwtAuthGuard).useValue(mockGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('/profile/admin/test (GET)', () => {
    return request(app.getHttpServer() as any)
      .get('/profile/admin/test')
      .expect(200)
      .expect({ status: 'Profile Controller OK' });
  });

  it('/profile/me (GET)', () => {
    return request(app.getHttpServer() as any)
      .get('/profile/me')
      .expect(200)
      .expect({ id: 1, name: 'Alice' });
  });
});
