import { 
  Controller, 
  Post, 
  Body, 
  UnauthorizedException, 
  HttpCode, 
  HttpStatus, 
  UseGuards,
  Res,
  Req,
  Get
} from "@nestjs/common";
import type { Response, Request } from 'express'; // Import as type
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { AuthGuard } from "../../shared/guards/auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get("csrf-token")
  @HttpCode(HttpStatus.OK)
  getCsrfToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // CSRF token is automatically generated and attached to req.csrfToken()
    // by the csurf middleware when this endpoint is hit
    return {
      csrfToken: (req as any).csrfToken ? (req as any).csrfToken() : 'development-mode',
      timestamp: new Date().toISOString(),
    };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  async login(
    @Body() loginDto: { email: string; password: string },
    @Res({ passthrough: true }) res: Response
  ) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.authService.login(user, res);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response
  ) {
    const userId = req.user.sub;
    return this.authService.logout(userId, res);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const refreshToken = req.cookies?.refresh_token;
    
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    return this.authService.refreshToken(refreshToken, res);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  async getCurrentUser(@Req() req: any) {
    // User is attached to request by AuthGuard
    return {
      user: {
        id: req.user.sub,
        email: req.user.email,
        organizationId: req.user.organizationId,
      }
    };
  }

  @Post("register")
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 registrations per minute
  async register(
    @Body()
    registerDto: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      organizationName: string;
    },
  ) {
    // For MVP: Create user with a new organization
    // This is simplified - in production you'd want more validation
    return this.authService.register(registerDto);
  }
}
