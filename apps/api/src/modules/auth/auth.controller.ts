import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  async login(@Body() loginDto: { email: string; password: string }) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.authService.login(user);
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
