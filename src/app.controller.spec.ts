import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('admin-check', () => {
    it('should return admin access message', () => {
      expect(appController.adminCheck()).toEqual({ message: '¡Acceso de administrador concedido!' });
    });
  });
});
