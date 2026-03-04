import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { UsersService } from '../src/users/users.service';
import { LocalAuthGuard } from '../src/auth/guards/local-auth.guard';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

const mockGuard = {
  canActivate: (context: any) => {
    const req = context.switchToHttp().getRequest();
    req.user = { id: 1, email: 'test@test.com', tenant: { id: 1 } };
    return true;
  },
};

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  const mockAuthService = {
    login: jest.fn(() => ({
      access_token: 'test_token',
      refresh_token: 'test_refresh',
      token_type: 'bearer',
    })),
    hashPassword: jest.fn(() => 'hashed_pw'),
    validateUser: jest.fn(() => ({
      id: 1,
      email: 'test@test.com',
      tenant: { id: 1 },
    })),
  };
  const mockUsersService = {
    create: jest.fn(() => ({ id: 1, email: 'test@test.com' })),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: {} },
        { provide: ConfigService, useValue: {} },
      ],
    })
      .overrideGuard(LocalAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('/auth/admin/test (GET)', () => {
    return request(app.getHttpServer())
      .get('/auth/admin/test')
      .expect(200)
      .expect({ status: 'Auth Controller OK' });
  });

  it('/auth/login (POST)', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'test@test.com', password: 'password123' })
      .expect(200)
      .expect({
        access_token: 'test_token',
        refresh_token: 'test_refresh',
        token_type: 'bearer',
      });
  });
});
