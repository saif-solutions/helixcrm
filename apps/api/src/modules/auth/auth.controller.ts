import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
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
