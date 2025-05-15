import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
// This guard simply activates the 'local' strategy (LocalStrategy)
// The validation logic is in LocalStrategy.validate()
