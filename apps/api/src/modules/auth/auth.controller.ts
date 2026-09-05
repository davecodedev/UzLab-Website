import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { AccessKeyLoginDto } from './dto/access-key.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Throttle } from '@nestjs/throttler';
import { THROTTLE_AUTH } from '../../common/throttling.js';

/**
 * A short, human label for the device, kept only so a displaced session can be
 * described to the person it was taken from ("signed in on Chrome, Windows").
 * The full user agent is not stored — it is a fingerprint, and none of this
 * needs one.
 */
function deviceLabel(userAgent?: string): string | undefined {
  if (!userAgent) return undefined;
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /OPR\//.test(userAgent)
      ? 'Opera'
      : /Chrome\//.test(userAgent)
        ? 'Chrome'
        : /Firefox\//.test(userAgent)
          ? 'Firefox'
          : /Safari\//.test(userAgent)
            ? 'Safari'
            : 'Browser';
  const os = /Windows/.test(userAgent)
    ? 'Windows'
    : /Android/.test(userAgent)
      ? 'Android'
      : /iPhone|iPad/.test(userAgent)
        ? 'iOS'
        : /Mac OS X/.test(userAgent)
          ? 'macOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : 'unknown device';
  return `${browser}, ${os}`;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: THROTTLE_AUTH })
  @Post('register')
  register(
    @Body() dto: RegisterDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.register(dto, deviceLabel(userAgent));
  }

  @Throttle({ default: THROTTLE_AUTH })
  @Post('login')
  login(@Body() dto: LoginDto, @Headers('user-agent') userAgent?: string) {
    return this.authService.login(dto, deviceLabel(userAgent));
  }

  /**
   * Signing in with the organisation's access key.
   *
   * Rate limited like the password endpoints: the key is short enough to read
   * down a phone, which is the same property that makes it worth guessing.
   */
  @Throttle({ default: THROTTLE_AUTH })
  @Post('login-key')
  loginWithKey(
    @Body() dto: AccessKeyLoginDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.loginWithAccessKey(
      dto.accessKey,
      deviceLabel(userAgent),
    );
  }

  @Throttle({ default: THROTTLE_AUTH })
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: unknown) {
    return user;
  }
}
