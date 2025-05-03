import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') { }
// Este guard simplemente activa la 'local' strategy (LocalStrategy)
// La lógica de validación está en LocalStrategy.validate() 